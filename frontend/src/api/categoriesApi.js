import axiosInstance from './axiosInstance';

export const getCategories = () => axiosInstance.get('/categories').then(r => r.data.data);
export const createCategory = (data) => axiosInstance.post('/categories', data).then(r => r.data.data);
export const updateCategory = (id, data) => axiosInstance.put(`/categories/${id}`, data).then(r => r.data.data);
export const deleteCategory = (id) => axiosInstance.delete(`/categories/${id}`);
