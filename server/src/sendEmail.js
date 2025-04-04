const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Store OTP codes with expiry time (in memory - consider using Redis in production)
const otpStore = new Map();

const emailService = {
  // Configure transporter (update with your SMTP settings)
  transporter: nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  }),

  // Generate OTP code
  generateOTP: () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  // Store OTP with 10 minute expiry
  storeOTP: (email, otp) => {
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(email, { otp, expiry });
  },

  // Verify OTP
  verifyOTP: (email, otp) => {
    const data = otpStore.get(email);
    if (!data) return false;
    if (Date.now() > data.expiry) {
      otpStore.delete(email);
      return false;
    }
    return data.otp === otp;
  },

  // Remove OTP after successful verification
  clearOTP: (email) => {
    otpStore.delete(email);
  },

  // Send password reset email
  sendPasswordResetEmail: async (email, otp) => {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Đặt lại mật khẩu - AMFIE HCMUTE',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Đặt lại mật khẩu</h2>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
            <p>Mã xác nhận của bạn là:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; background-color: #f3f4f6; padding: 10px; text-align: center; font-family: monospace;">${otp}</h1>
            <p>Mã này có hiệu lực trong 10 phút.</p>
            <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            <p>Trân trọng,<br>Đội ngũ AMFIE HCMUTE</p>
          </div>
        `,
      };

      await emailService.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }
};

module.exports = emailService;