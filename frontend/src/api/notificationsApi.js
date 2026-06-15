import axiosInstance from './axiosInstance';

export const getNotifications = (params = {}) =>
  axiosInstance.get('/notifications', { params }).then(r => r.data);

export const markRead = (id) =>
  axiosInstance.put(`/notifications/${id}/read`).then(r => r.data.data);

export const markAllRead = () =>
  axiosInstance.put('/notifications/read-all');

export const deleteNotification = (id) =>
  axiosInstance.delete(`/notifications/${id}`);

export const subscribePush = (subscription) =>
  axiosInstance.post('/notifications/subscribe', subscription);

export const unsubscribePush = () =>
  axiosInstance.delete('/notifications/unsubscribe');
