const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const emailService = require("../sendEmail");
const { createNotification } = require("./notificationController");

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
            await createNotification({
                message: `Tài khoản "${user.name}" đã được cập nhật`,
                type: 'user',
                relatedItem: user._id,
                itemModel: 'User'
              });
              
            res.status(200).json(others);
        }catch(err){
            res.status(500).json(err);
        }
    },
    createUser: async (req, res) => {
        try {
            // Check if user is admin - Sử dụng role thay vì isAdmin
            if (!req.user || req.user.role !== 'admin') {
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
                role: req.body.role || 'user',
                isActive: true
            });

            const savedUser = await newUser.save();
            const { password, ...userData } = savedUser._doc;
            
            // // Send email notification to the new user
            // const emailSent = await emailService.sendWelcomeEmail(req.body.email, req.body.name);
            // if (!emailSent) {
            //     return res.status(500).json({
            //         message: "Không thể gửi email chào mừng. Vui lòng thử lại sau",
            //         status: "error"
            //     });
            // }

            await createNotification({
                message: `Tài khoản mới "${userData.name}" đã được tạo`,
                type: 'user',
                relatedItem: userData._id,
                itemModel: 'User'
              });

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
            await user.save();
            
            await createNotification({
                message: `Trạng thái tài khoản "${user.name}" đã được thay đổi`,
                type: 'user',
                relatedItem: user._id,
                itemModel: 'User'
            });
            
            res.status(200).json({
                message: "Cập nhật trạng thái tài khoản thành công",
                status: "success"
            });
        }catch(err){
            res.status(500).json({
                message: "Có lỗi khi cập nhật trạng thái tài khoản",
                status: "error",
                error: err.message
            });
        }
    },
    deleteUser: async ( req, res ) => {
        try {
            // Chỉ admin mới được xóa tài khoản
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({
                    message: "Bạn không có quyền xóa tài khoản",
                    status: "error"
                });
            }
            
            const user = await User.findByIdAndDelete(req.params.id);
            if (!user) {
                return res.status(404).json({
                    message: "Không tìm thấy tài khoản",
                    status: "error"
                });
            }

            await createNotification({
                message: `Tài khoản "${user.name}" đã bị xóa khỏi hệ thống`,
                type: 'user'
            });

            res.status(200).json({
                message: "Xóa tài khoản thành công",
                status: "success"
            });
        }catch (err) {
            res.status(500).json({
                message: "Có lỗi khi xóa tài khoản",
                status: "error",
                error: err.message
            });
        }
    },
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