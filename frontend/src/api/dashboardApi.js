import axiosInstance from './axiosInstance';

export const getOverview = (params = {}) =>
  axiosInstance.get('/dashboard/overview', { params }).then(r => r.data.data);

export const getRecentTransactions = (params = {}) =>
  axiosInstance.get('/dashboard/recent-transactions', { params }).then(r => r.data.data);

export const getSpendingByCategory = (params = {}) =>
  axiosInstance.get('/dashboard/spending-by-category', { params }).then(r => r.data.data);

export const getTrend = (params = {}) =>
  axiosInstance.get('/dashboard/trend', { params }).then(r => r.data.data);
