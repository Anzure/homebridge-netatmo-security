import axios from 'axios';
import { stringify } from 'querystring';

export default class NetatmoAPI {

  constructor(config) {
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

  API() {
    return axios.create({
      baseURL: 'https://api.netatmo.com/api/',
      responseType: 'json',
    });
  }

  getHomeData() {
    const response = await this.API().get('/homesdata');
    const data = response.data.body;
    const home = data.homes[0];
    return home;
  }

  getHomeStatus(homeId) {
    const response = await this.API().get('/homestatus?=home_id=' + homeId);
    const data = response.data.body.home;
    const status = data.home;
    return status;
  }

  getHomeDevices(){
    const home = this.getHomeData();
    const status = this.getHomeStatus(home.id);
    const devices = [];
    home.modules.map((moduleInfo) => {
      const moduleStatus = status.modules.find((module) => moduleInfo.id === module.id);
      const device = { ...moduleStatus,
        name: moduleInfo.name,
        category: moduleInfo.category,
        setup_date: moduleInfo.setup_date,
        room_id: moduleInfo.room_id,
      };
      devices.append(device);
    });
    return devices;
  }

}
