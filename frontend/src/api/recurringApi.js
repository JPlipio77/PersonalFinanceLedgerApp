import axiosInstance from './axiosInstance';

export const listRules    = (params = {}) => axiosInstance.get('/recurring', { params }).then((r) => ({ data: r.data.data, pagination: r.data.pagination }));
export const getRule      = (id)           => axiosInstance.get(`/recurring/${id}`).then((r) => r.data.data);
export const createRule   = (data)         => axiosInstance.post('/recurring', data).then((r) => r.data.data);
export const updateRule   = (id, data)     => axiosInstance.put(`/recurring/${id}`, data).then((r) => r.data.data);
export const deleteRule   = (id)           => axiosInstance.delete(`/recurring/${id}`).then((r) => r.data);
