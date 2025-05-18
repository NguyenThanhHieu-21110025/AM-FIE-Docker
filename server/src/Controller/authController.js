const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const TokenModel = require("../models/tokenModel");

const authController = {
    registerUser: async (req, res) => {
        try {
            const {
                name,
                email,
                password,
                phoneNumber,
                position,
                role,
            } = req.body;

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const newUser = new User({
                name,
                email,
                password: hashedPassword,
                phoneNumber,
                position,
                role, // nếu không truyền sẽ mặc định là 'user'
            });

            const user = await newUser.save();

            const accessToken = authController.generateAccessToken(user);
            const refreshToken = authController.generateRefreshToken(user);

            await TokenModel.create({
                userId: user._id,
                refreshToken,
            });

            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                path: "/",
                sameSite: "strict",
            });

            const { password: pw, ...others } = user._doc;
            res.status(201).json({ ...others, accessToken });
        } catch (err) {
            console.error("Register error:", err);
            res.status(500).json({ message: "Server error", error: err.message });
        }
    },

    generateAccessToken: (user) => {
        return jwt.sign(
            {
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin,
            },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );
    },

    generateRefreshToken: (user) => {
        return jwt.sign(
            {
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin,
            },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: "365d" }
        );
    },

    loginUser: async (req, res) => {
        try {
            const user = await User.findOne({ email: req.body.email });
            if (!user) {
                return res.status(404).json({ message: "User not found!" });
            }

            if (!user.isActive) {
                return res.status(403).json({ message: "Account is deactivated!" });
            }

            const validPassword = await bcrypt.compare(req.body.password, user.password);
            if (!validPassword) {
                return res.status(401).json({ message: "Invalid password!" });
            }

            const accessToken = authController.generateAccessToken(user);
            const refreshToken = authController.generateRefreshToken(user);

            await TokenModel.findOneAndDelete({ userId: user._id });

            await TokenModel.create({
                userId: user._id,
                refreshToken,
            });

            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production", 
                sameSite: "None",
                path: "/api/auth/refresh",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            const { password: pw, ...others } = user._doc;
            res.status(200).json({ ...others, accessToken });
        } catch (err) {
            console.error("Login error:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    requestRefreshToken: async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(401).json("You're not authenticated");
            }

            const existingToken = await TokenModel.findOne({ refreshToken });
            if (!existingToken) {
                return res.status(403).json("Refresh token is not valid");
            }

            jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, userPayload) => {
                if (err) {
                    return res.status(403).json("Invalid or expired refresh token");
                }

                await TokenModel.findOneAndDelete({ refreshToken });

                const newAccessToken = authController.generateAccessToken(userPayload);
                const newRefreshToken = authController.generateRefreshToken(userPayload);

                await TokenModel.create({
                    userId: userPayload.id,
                    refreshToken: newRefreshToken,
                });

                res.cookie("refreshToken", newRefreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    path: "/",
                    sameSite: "strict",
                });

                return res.status(200).json({ accessToken: newAccessToken });
            });
        } catch (error) {
            console.error("Refresh token error:", error);
            res.status(500).json("Internal server error");
        }
    },

    userLogout: async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (refreshToken) {
                await TokenModel.findOneAndDelete({ refreshToken });
            }
            res.clearCookie("refreshToken");
            res.status(200).json("You logged out successfully");
        } catch (err) {
            res.status(500).json({ message: "Logout failed", error: err.message });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            await TokenModel.deleteMany({ userId: user._id });
            await user.deleteOne();

            res.status(200).json({ message: "User deleted successfully" });
        } catch (err) {
            res.status(500).json({ message: "Delete failed", error: err.message });
        }
    },
};

module.exports = authController;
