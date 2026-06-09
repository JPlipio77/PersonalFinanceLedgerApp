import axiosInstance from './axiosInstance';

export const login = (identifier, password) =>
  axiosInstance.post('/auth/login', { identifier, password }).then((r) => r.data);

export const register = (data) =>
  axiosInstance.post('/auth/register', data).then((r) => r.data);

export const forgotPassword = (email) =>
  axiosInstance.post('/auth/forgot-password', { email }).then((r) => r.data);

export const resetPassword = (token, password, confirmPassword) =>
  axiosInstance.post(`/auth/reset-password/${token}`, { password, confirmPassword }).then((r) => r.data);
