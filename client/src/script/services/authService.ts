import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL + "/user";

const authService = {
  // Request password reset (send OTP)
  requestPasswordReset: async (email: string) => {
    return axios.post(`${API_URL}/request-password-reset`, { email });
  },

  // Verify reset code
  verifyResetCode: async (email: string, code: string) => {
    return axios.post(`${API_URL}/verify-reset-code`, { email, code });
  },

  // Reset password
  resetPassword: async (email: string, code: string, password: string) => {
    return axios.post(`${API_URL}/reset-password`, { 
      email, 
      code, 
      password 
    });
  }
};

export default authService;