import axios from 'axios';
import FormData from 'form-data';

export default class NetatmoAPI {
  log = null;
  config = null;
  tokenExpire = 0;
  refreshToken = null;

  constructor(logger) {
    this.log = logger;
    this.log.info('Netatmo API constructed.');
  }

  async init(configuration) {
    this.config = configuration;
    await this.authenticate();
    this.log.info('Netatmo API loaded.');
  }

  async authenticate() {
    const form = new FormData();
    form.append('client_id', this.config.client_id);
    form.append('client_secret', this.config.client_secret);
    if (this.refreshToken !== null){
      form.append('grant_type', 'refresh_token');
      form.append('refresh_token', this.refreshToken);
    } else {
      form.append('grant_type', 'password');
      form.append('username', this.config.username);
      form.append('password', this.config.password);
      form.append('scope', 'read_camera write_camera');
    }

    const formHeaders = form.getHeaders();

    const response = await axios.post('https://api.netatmo.com/oauth2/token', form, {
      headers: {
        ...formHeaders,
      },
    });
    const data = response.data;
    this.log.debug('Authentication response: ' + response);
    const token = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tokenExpire = (new Date().getTime() / 1000) + 9000;
    this.log.info('Access token: ' + token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    this.log.info('Authentication complete');
  }

  API() {
    const time = new Date().getTime() / 1000;
    if (time >= this.tokenExpire || this.refreshToken === null){
      this.log.info('Refreshing authentication token...');
      this.tokenExpire = time + 9000;
      this.authenticate().then(() => this.log.info('Refreshed authentication token.'));
    }
    return axios.create({
      baseURL: 'https://api.netatmo.com/api/',
      responseType: 'json',
    });
  }

  async setState(device, status) {
    const body = { home: {
      id: device.home_id,
      modules: [
        {
          id: device.id,
          status: status,
          bridge: device.bridge,
        },
      ],
    }};
    const response = await this.API().post('/setstate', body);
    const data = response.data;
    return data;
  }

  async getEvents(homeId) {
    const response = await this.API().get('/getevents?home_id=' + homeId);
    const data = response.data.body.home;
    const events = data.events;
    return events;
  }

  async getHomeData() {
    const response = await this.API().get('/homesdata');
    const data = response.data.body;
    const home = data.homes[0];
    return home;
  }

  async getHomeStatus(homeId) {
    const response = await this.API().get('/homestatus?home_id=' + homeId);
    const data = response.data.body;
    const status = data.home;
    return status;
  }

  async getHomeDevices() {
    const home = await this.getHomeData();
    this.log.info('Total devices found: ' + home.modules.length);
    const status = await this.getHomeStatus(home.id);
    this.log.info('Devices with status: ' + status.modules.length);
    const events = await this.getEvents(home.id);
    this.log.info('Total events found: ' + events.length);
    const devices = [];
    home.modules.map((moduleInfo) => {
      const moduleStatus = status.modules.find((module) => moduleInfo.id === module.id);
      const minimumTime = (new Date().getTime() / 1000) - 90;
      const moduleEvents = events.filter((event) => moduleInfo.id === event.module_id && event.time > minimumTime);
      const lastActivity = moduleEvents.length > 0 ? Math.max.apply(Math, moduleEvents.map((event) => event.time)) : 0;
      const device = { ...moduleStatus,
        name: moduleInfo.name,
        category: moduleInfo.category,
        setup_date: moduleInfo.setup_date,
        room_id: moduleInfo.room_id,
        activity: lastActivity,
      };
      devices.push(device);
    });
    this.log.info('Total ready devices: ' + devices.length);
    return devices;
  }

}
