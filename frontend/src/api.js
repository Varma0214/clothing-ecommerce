import axios from 'axios';

const API = axios.create({ baseURL: 'https://clothing-backend-1wug.onrender.com/api' });

API.interceptors.request.use((req) => {
  if (localStorage.getItem('userInfo')) {
    req.headers.Authorization = `Bearer ${JSON.parse(localStorage.getItem('userInfo')).token}`;
  }
  return req;
});
export default API;