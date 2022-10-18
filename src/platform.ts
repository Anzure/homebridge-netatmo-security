/* eslint-disable @typescript-eslint/no-explicit-any */
import { API, DynamicPlatformPlugin, PlatformAccessory, Logger, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { TagSensorAccessory } from './accessory/tagSensorAccessory';
import NetatmoAPI from './util/NetatmoAPI';
import { IndoorSirenAccessory } from './accessory/indoorSirenAccessory';

export class NetatmoSecurityPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];
  public netatmoAPI: NetatmoAPI;

  // Load platform
  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    log.debug('Finished loading platform:', this.config.name);
    this.netatmoAPI = new NetatmoAPI(log);
    log.debug('Finished initializing platform:', this.config.name);
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      log.debug('Authenticating with provider:', this.config.name);
      this.netatmoAPI.init(config).then(() => {
        log.debug('Authenticated with provider:', this.config.name);
        this.discoverDevices();
        this.startRefreshTask();
        log.debug('Config loaded: ' + JSON.stringify({...config, password: '******', client_secret: '********'}));
      });
    });
  }

  // Configure device
  configureAccessory(accessory: PlatformAccessory) {
    if (accessory.context.device.type === 'NIS') {
      this.log.debug('Loading accessory from cache:', accessory.displayName);
      new IndoorSirenAccessory(this, accessory);
      this.accessories.push(accessory);
    } else if (accessory.context.device.type === 'NACamDoorTag') {
      this.log.debug('Loading accessory from cache:', accessory.displayName);
      new TagSensorAccessory(this, accessory);
      this.accessories.push(accessory);
    } else {
      this.log.debug('Device type not supported: ' + accessory.context.device.type);
    }
  }

  // Load devices
  discoverDevices() {
    this.netatmoAPI.getHomeDevices().then((devices) => {
      for (const device of devices) {

        if (device.type !== 'NACamDoorTag' && device.type !== 'NIS') {
          this.log.debug('Skipped unsupported accessory: ' + device.name);
          continue;
        }

        device.name = device.name.trimEnd();
        const uuid = this.api.hap.uuid.generate(device.id);
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

        if (existingAccessory) {
          this.log.debug('Existing accessory discovered: ' + existingAccessory.displayName);
          this.configureAccessory(existingAccessory);
          existingAccessory.context.device = device;

        } else {

          this.log.debug('Adding newly discovered accessory: ' + device.name);
          const accessory = new this.api.platformAccessory(device.name, uuid);
          accessory.context.device = device;
          this.configureAccessory(accessory);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }
    });
  }

  // Refresh task
  startRefreshTask() {
    setInterval(() => {
      try {
        this.refreshStatus();
      } catch (error) {
        this.log.error('Failed to refresh status: ' + this.config.name, error);
      }
    }, 20000);
  }

  // Refresh status
  refreshStatus() {
    this.netatmoAPI.getHomeDevices().then((devices) => {
      for (const device of devices) {

        if (device.type !== 'NACamDoorTag' && device.type !== 'NIS') {
          continue;
        }

        const uuid = this.api.hap.uuid.generate(device.id);
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

        if (existingAccessory) {
          existingAccessory.context.device = device;
          this.accessories.push(existingAccessory);
        }
      }
    });
  }

}
