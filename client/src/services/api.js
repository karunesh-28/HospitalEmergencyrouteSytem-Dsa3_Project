import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

export const getRoads = () => api.get('/roads').then(res => res.data);
export const getAmbulances = () => api.get('/ambulances').then(res => res.data);
export const getIncidents = () => api.get('/incidents').then(res => res.data);
export const dispatchAmbulance = (data) => api.post('/route/dispatch', data).then(res => res.data);
export const arriveAmbulance = (logId) => api.patch(`/route/arrive/${logId}`).then(res => res.data);
export const getLogs = (params) => api.get('/logs', { params }).then(res => res.data);

export default api;
