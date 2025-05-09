const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const emailService = require("../sendEmail");

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
            if (!req.user || !req.user.isAdmin) {
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
                isAdmin: req.body.isAdmin || false,
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
    requestPasswordReset: async (req, res) => {
        try {
            const { email } = req.body;
            
            // Check if email exists
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({
                    message: "Email không tồn tại trong hệ thống",
                    status: "error"
                });
            }
            
            // Generate and store OTP
            const otp = emailService.generateOTP();
            emailService.storeOTP(email, otp);
            
            // Send OTP via email
            const emailSent = await emailService.sendPasswordResetEmail(email, otp);
            if (!emailSent) {
                return res.status(500).json({
                    message: "Không thể gửi email xác thực. Vui lòng thử lại sau",
                    status: "error"
                });
            }
            
            res.status(200).json({
                message: "Mã xác thực đã được gửi đến email của bạn",
                status: "success"
            });
        } catch (err) {
            console.error("Password reset request error:", err);
            res.status(500).json({
                message: "Có lỗi xảy ra. Vui lòng thử lại sau",
                status: "error",
                error: err.message
            });
        }
    },
    
    // Verify OTP code
    verifyResetCode: async (req, res) => {
        try {
            const { email, code } = req.body;
            
            // Verify OTP
            const isValid = emailService.verifyOTP(email, code);
            if (!isValid) {
                return res.status(400).json({
                    message: "Mã xác thực không hợp lệ hoặc đã hết hạn",
                    status: "error"
                });
            }
            
            res.status(200).json({
                message: "Mã xác thực hợp lệ",
                status: "success"
            });
        } catch (err) {
            console.error("OTP verification error:", err);
            res.status(500).json({
                message: "Có lỗi xảy ra. Vui lòng thử lại sau",
                status: "error",
                error: err.message
            });
        }
    },
    
    // Reset password
    resetPassword: async (req, res) => {
        try {
            const { email, code, password } = req.body;
            
            // Verify OTP again
            const isValid = emailService.verifyOTP(email, code);
            if (!isValid) {
                return res.status(400).json({
                    message: "Mã xác thực không hợp lệ hoặc đã hết hạn",
                    status: "error"
                });
            }
            
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // Update user password
            const user = await User.findOneAndUpdate(
                { email },
                { password: hashedPassword },
                { new: true }
            );
            
            if (!user) {
                return res.status(404).json({
                    message: "Không tìm thấy người dùng",
                    status: "error"
                });
            }
            
            // Clear OTP after successful reset
            emailService.clearOTP(email);
            
            res.status(200).json({
                message: "Mật khẩu đã được cập nhật thành công",
                status: "success"
            });
        } catch (err) {
            console.error("Password reset error:", err);
            res.status(500).json({
                message: "Có lỗi xảy ra khi đặt lại mật khẩu",
                status: "error",
                error: err.message
            });
        }
    }
};

module.exports = userController;