import axios from 'axios';
import { stringify } from 'querystring';

export default function NetatmoAPI(config) {

  if (axios.defaults.headers.common['Authorization'] === null || axios.defaults.headers.common['Authorization'] === undefined) {
    const credentials = {
      client_id: config.client_id,
      client_secret: config.client_secret,
      grant_type: 'password',
      username: config.username,
      password: config.password,
      scope: 'read_camera write_camera',
    };
    const response = axios.post('https://api.netatmo.com/oauth2/token', stringify(credentials));
    const token = response.data.access_token;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  return axios.create({
    baseURL: 'https://api.netatmo.com/api/',
    responseType: 'json',
  });

}
