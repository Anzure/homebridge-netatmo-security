import axios from 'axios';
import { getCookie } from '../utils/Cookie';

export class NetatmoAPI {

  constructor(
    accessToken,
  ) {
    const response: unknown = axios.post('/auth/login');
    accessToken = response.data.accessToken;
  }

  API() {
    const cookie = getCookie('neta-token');
    const token = cookie ? cookie : null;

    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    return axios.create({
      baseURL: 'http://localhost:8080/',
      responseType: 'json',
    });
  }
}