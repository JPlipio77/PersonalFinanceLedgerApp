import axiosInstance from './axiosInstance';

export const getBudgets = (params = {}) =>
  axiosInstance.get('/budgets', { params }).then(r => r.data.data);

export const getBudgetSummary = (params = {}) =>
  axiosInstance.get('/budgets/summary', { params }).then(r => r.data.data);

export const getBudget = (id) =>
  axiosInstance.get(`/budgets/${id}`).then(r => r.data.data);

export const upsertBudget = (data) =>
  axiosInstance.post('/budgets', data).then(r => r.data.data);

export const updateBudget = (id, data) =>
  axiosInstance.put(`/budgets/${id}`, data).then(r => r.data.data);

export const deleteBudget = (id) =>
  axiosInstance.delete(`/budgets/${id}`);
