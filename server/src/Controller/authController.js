const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const TokenModel = require("../models/tokenModel");

const authController = {
    registerUser: async (req, res) => {
        try {
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(req.body.password, salt);

            const newUser = new User({
                name: req.body.name,
                email: req.body.email,
                password: hashed,
            });

            const user = await newUser.save();

            const accessToken = authController.generateAccessToken(user);
            const refreshToken = authController.generateRefreshToken(user);

            // Lưu refresh token vào DB
            await TokenModel.create({
                userId: user._id,
                refreshToken,
            });

            // Gửi refresh token qua cookie
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                path: "/",
                sameSite: "strict",
            });

            const { password, ...others } = user._doc;
            res.status(201).json({ ...others, accessToken });
        } catch (err) {
            res.status(500).json({ message: "Server error", error: err.message });
        }
    },

    generateAccessToken: (user) => {
        return jwt.sign(
            {
                id: user._id,
                email: user.email,
                admin: user.admin,
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
                admin: user.admin,
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

            const validPassword = await bcrypt.compare(req.body.password, user.password);
            if (!validPassword) {
                return res.status(401).json({ message: "Invalid password!" });
            }

            const accessToken = authController.generateAccessToken(user);
            const refreshToken = authController.generateRefreshToken(user);

            // Xoá token cũ nếu có
            await TokenModel.findOneAndDelete({ userId: user._id });

            // Lưu token mới vào DB
            await TokenModel.create({
                userId: user._id,
                refreshToken,
            });

            // Set cookie refresh token
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                // secure: true, // nếu dùng https
                sameSite: "None", // quan trọng khi frontend-backend khác domain hoặc khác port
                path: "/auth/refresh",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
              });
              

            const { password, ...others } = user._doc;
            res.status(200).json({ ...others, accessToken });
        } catch (err) {
            console.error("Error during login:", err);
            res.status(500).json({ message: "Internal server error!" });
        }
    },

    requestRefreshToken: async (req, res) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(401).json("You're not authenticated");
            }

            // Kiểm tra token có tồn tại trong DB không
            const existingToken = await TokenModel.findOne({ refreshToken });
            if (!existingToken) {
                return res.status(403).json("Refresh token is not valid");
            }

            jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, user) => {
                if (err) {
                    return res.status(403).json("Invalid or expired refresh token");
                }

                // Xoá token cũ trong DB
                await TokenModel.findOneAndDelete({ refreshToken });

                const newAccessToken = authController.generateAccessToken(user);
                const newRefreshToken = authController.generateRefreshToken(user);

                // Lưu token mới vào DB
                await TokenModel.create({
                    userId: user.id,
                    refreshToken: newRefreshToken,
                });

                // Gửi lại cookie refresh token mới
                res.cookie("refreshToken", newRefreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    path: "/",
                    sameSite: "strict",
                });

                return res.status(200).json({ accessToken: newAccessToken });
            });
        } catch (error) {
            console.error("Error in requestRefreshToken:", error);
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

            // Xoá tất cả refresh token của user nếu có
            await TokenModel.deleteMany({ userId: user._id });
            await user.remove();

            res.status(200).json({ message: "User deleted successfully" });
        } catch (err) {
            res.status(500).json(err);
        }
    },
};

module.exports = authController;