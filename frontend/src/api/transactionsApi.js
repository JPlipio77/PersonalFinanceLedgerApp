import axiosInstance from './axiosInstance';

export const getTransactions = (params = {}) =>
  axiosInstance.get('/transactions', { params }).then(r => r.data);

export const getTransaction = (id) =>
  axiosInstance.get(`/transactions/${id}`).then(r => r.data.data);

export const createTransaction = (data) =>
  axiosInstance.post('/transactions', data).then(r => r.data.data);

export const updateTransaction = (id, data) =>
  axiosInstance.put(`/transactions/${id}`, data).then(r => r.data.data);

export const deleteTransaction = (id) =>
  axiosInstance.delete(`/transactions/${id}`);

export const restoreTransaction = (id) =>
  axiosInstance.post(`/transactions/${id}/restore`).then(r => r.data.data);

export const exportTransactions = (format = 'csv', params = {}) =>
  axiosInstance.get('/transactions/export', {
    params: { ...params, format },
    responseType: 'blob',
  });
