import axiosInstance from './axiosInstance';

export const getMonthlyReport = (month, year) =>
  axiosInstance.get('/reports/monthly', { params: { month, year } }).then((r) => r.data.data);

export const getYearlyReport = (year) =>
  axiosInstance.get('/reports/yearly', { params: { year } }).then((r) => r.data.data);
