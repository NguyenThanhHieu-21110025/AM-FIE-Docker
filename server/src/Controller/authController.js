const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { createClient } = require("redis");

// Khởi tạo Redis client
let redisClient;
(async () => {
    redisClient = createClient({
        socket: {
            host: '127.0.0.1',
            port: 6379
        }
    });

    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    await redisClient.connect();
    console.log('Connected to Redis');
})();

const authController = {
    // Register User
    registerUser: async (req, res) => {
        try {
            const { name, email, password, phoneNumber, position, role } = req.body;

            // Check if user exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "Email already exists" });
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create new user
            const newUser = new User({
                name,
                email,
                password: hashedPassword,
                phoneNumber,
                position,
                role: role || "user",
                isActive: true
            });

            const user = await newUser.save();

            // Generate tokens
            const accessToken = authController.generateAccessToken(user);
            const refreshToken = authController.generateRefreshToken(user, req);

            // Store refresh token in Redis
            await redisClient.set(user._id.toString(), refreshToken, {
                EX: 7 * 24 * 60 * 60 // 7 days
            });

            // Set refresh token in cookie
            // Sửa lại phần set cookie
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
                path: "/",
                maxAge: 7 * 24 * 60 * 60 * 1000,
                domain: process.env.NODE_ENV === 'production' ? 'yourdomain.com' : undefined
            });

            // Return user data without password
            const { password: pw, ...userData } = user._doc;
            res.status(201).json({
                ...userData,
                accessToken,
                role: user.role,
                userid: user._id,
            });
        } catch (err) {
            console.error("Register error:", err);
            res.status(500).json({ message: "Server error", error: err.message });
        }
    },

    // Login User
    loginUser: async (req, res) => {
        try {
            const user = await User.findOne({ email: req.body.email });
            if (!user) return res.status(404).json({ message: "User not found!" });
            if (!user.isActive) return res.status(403).json({ message: "Account deactivated!" });

            // Validate password
            const validPassword = await bcrypt.compare(req.body.password, user.password);
            if (!validPassword) return res.status(401).json({ message: "Invalid password!" });

            // Generate tokens
            const accessToken = authController.generateAccessToken(user);
            const refreshToken = authController.generateRefreshToken(user, req);

            // Store refresh token in Redis (invalidate previous tokens)
            await redisClient.set(user._id.toString(), refreshToken, {
                EX: 7 * 24 * 60 * 60 // 7 days
            });

            // Set refresh token in cookie
            // Sửa lại phần set cookie
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
                path: "/",
                maxAge: 7 * 24 * 60 * 60 * 1000,
                domain: process.env.NODE_ENV === 'production' ? 'yourdomain.com' : undefined
            });

            // Return user data without password
            const { password: pw, ...userData } = user._doc;
            res.status(200).json({
                ...userData,
                accessToken,
                role: user.role,
                userid: user._id,
            });
        } catch (err) {
            console.error("Login error:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    // Refresh Access Token
    requestRefreshToken: async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(401).json("You're not authenticated");
            }

            // Verify token
            jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, userPayload) => {
                if (err) {
                    return res.status(403).json("Invalid or expired refresh token");
                }

                // Check fingerprint
                const currentFingerprint = authController.generateFingerprint(req);
                if (userPayload.fingerprint !== currentFingerprint) {
                    return res.status(403).json("Suspicious activity detected");
                }

                // Check if token exists in Redis
                const storedToken = await redisClient.get(userPayload.id);
                if (storedToken !== refreshToken) {
                    return res.status(403).json("Refresh token was revoked");
                }

                // Generate new tokens
                const newAccessToken = authController.generateAccessToken(userPayload);
                const newRefreshToken = authController.generateRefreshToken(userPayload, req);

                // Update Redis with new refresh token
                await redisClient.set(userPayload.id, newRefreshToken, {
                    EX: 7 * 24 * 60 * 60
                });

                // Set new refresh token in cookie
                res.cookie("refreshToken", newRefreshToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: "Lax",
                    path: "/",
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });

                return res.status(200).json({ accessToken: newAccessToken });
            });
        } catch (error) {
            console.error("Refresh token error:", error);
            res.status(500).json("Internal server error");
        }
    },

    // Logout User
    userLogout: async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(400).json("No refresh token found");
            }

            // Verify token to get user ID
            jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, userPayload) => {
                if (err) {
                    // Token invalid but we'll still clear the cookie
                    res.clearCookie("refreshToken", { path: "/" });
                    return res.status(200).json("Logged out successfully");
                }

                // Delete refresh token from Redis
                await redisClient.del(userPayload.id);

                // Clear cookie
                res.clearCookie("refreshToken", { path: "/" });
                res.status(200).json("Logged out successfully");
            });
        } catch (err) {
            console.error("Logout error:", err);
            res.status(500).json({ message: "Logout failed", error: err.message });
        }
    },

    // Delete User
    deleteUser: async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) return res.status(404).json({ message: "User not found" });

            // Delete refresh token from Redis
            await redisClient.del(user._id.toString());

            await user.deleteOne();
            res.status(200).json({ message: "User deleted successfully" });
        } catch (err) {
            res.status(500).json({ message: "Delete failed", error: err.message });
        }
    },

    // Token Generators
    generateAccessToken: (user) => {
        return jwt.sign(
            {
                id: user._id || user.id,
                email: user.email,
                role: user.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );
    },

    generateRefreshToken: (user, req) => {
        const fingerprint = authController.generateFingerprint(req);
        return jwt.sign(
            {
                id: user._id || user.id,
                email: user.email,
                role: user.role,
                fingerprint: fingerprint
            },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: "7d" }
        );
    },

    // Fingerprint Generator
    generateFingerprint: (req) => {
        // Simple fingerprint based on user agent and IP
        // In production, you might want to add more factors
        const fingerprintData = (req.headers['user-agent'] || '') + (req.ip || '');
        return crypto.createHash('sha256').update(fingerprintData).digest('hex');
    }
};

module.exports = authController;