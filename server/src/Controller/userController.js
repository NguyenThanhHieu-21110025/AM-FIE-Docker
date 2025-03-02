const User = require("../models/userModel");
const bcrypt = require("bcrypt");

const userController = {
    getAllUsers: async ( req, res ) => {
        try {
            const user = await User.find();
            res.status(200).json(user);
        } catch (err) {
            res.status(500).json(err);
        }
    },
    getUserById: async ( req, res ) => {
        try {
            const user = await User.findById(req.params.id);
            const { password, ...others } = user._doc;
            res.status(200).json(others);
        }catch(err){
            res.status(500).json(err);
        }
    },
    updateUser: async ( req, res ) => {
        try {
            const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
            const { password,...others } = user._doc;
            res.status(200).json(others);
        }catch(err){
            res.status(500).json(err);
        }
    },
    createUser: async (req, res) => {
        try {
            // Check if user is admin
            if (!req.user || !req.user.admin) {
                return res.status(403).json({
                    message: "Bạn không có quyền tạo tài khoản",
                    status: "error"
                });
            }

            // Check if email already exists
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
                return res.status(400).json({
                    message: "Email đã tồn tại",
                    status: "error"
                });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);

            const newUser = new User({
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword,
                phoneNumber: req.body.phoneNumber || "",
                position: req.body.position || "",
                admin: req.body.admin || false,
                isActive: true
            });

            const savedUser = await newUser.save();
            const { password, ...userData } = savedUser._doc;
            
            res.status(201).json({
                message: "Tạo tài khoản thành công",
                status: "success",
                user: userData
            });
        } catch (err) {
            console.error("Create user error:", err);
            res.status(500).json({ 
                message: "Có lỗi xảy ra khi tạo tài khoản",
                status: "error",
                error: err.message 
            });
        }
    },
    isActive: async ( req, res ) => {
        try {
            const user = await User.findById(req.params.id);
            user.isActive =!user.isActive;
            res.status(200).json("Account has been updated");
        }catch(err){
            res.status(500).json(err);
        }
    },
    deleteUser: async ( req, res ) => {
        try {
            const user = await User.findByIdAndDelete(req.params.id);
            res.status(200).json("User has been deleted");
        }catch (err) {
            res.status(500).json(err);
    }},
    resetPassword: async ( req, res ) => {
        try {
            const user = await User.findOneAndUpdate(
                { email: req.body.email },
                { password: req.body.password },
                { new: true }
            );
            res.status(200).json("Password has been updated");
        } catch (err) {
            res.status(500).json(err);
        }
    }
};

module.exports = userController;