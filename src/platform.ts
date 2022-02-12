/* eslint-disable @typescript-eslint/no-explicit-any */
import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { TagSensorAccessory } from './accessory/tagSensorAccessory';
import NetatmoAPI from './util/NetatmoAPI';
import { IndoorSirenAccessory } from './accessory/indoorSirenAccessory';

export class NetatmoSecurityPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];
  public netatmoAPI: NetatmoAPI;
  public status: Record<string, any> | undefined;

  // Load platform
  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    log.info('Finished loading platform:', this.config.name);
    this.netatmoAPI = new NetatmoAPI(log);
    log.info('Finished initializing platform:', this.config.name);
    this.api.on('didFinishLaunching', () => {
      log.info('Executed didFinishLaunching callback');
      log.info('Authenticating with provider:', this.config.name);
      this.netatmoAPI.init(config).then(() => {
        log.info('Authenticated with provider:', this.config.name);
        this.discoverDevices();
        this.startRefreshTask();
        log.info('Config loaded: ' + JSON.stringify(config));
      });
    });
  }

  // Configure device
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  // Load devices
  discoverDevices() {
    this.netatmoAPI.getHomeDevices().then((devices) => {
      this.status = devices;
      for (const device of devices) {
        const uuid = this.api.hap.uuid.generate(device.id);
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

        if (existingAccessory) {
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
          new TagSensorAccessory(this, existingAccessory);

        } else if (device.type === 'NACamDoorTag') {
          this.log.info('Adding new accessory:', device.name);
          const accessory = new this.api.platformAccessory(device.name, uuid);
          accessory.context.device = device;
          new TagSensorAccessory(this, accessory);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

        } else if (device.type === 'NIS'){
          this.log.info('Adding new accessory:', device.name);
          const accessory = new this.api.platformAccessory(device.name, uuid);
          accessory.context.device = device;
          new IndoorSirenAccessory(this, accessory);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);

        } else {
          this.log.info('Unsupported device type: ' + device.type);
        }
      }
    });
  }

  // Refresh task
  startRefreshTask() {
    this.refreshStatus();
    setInterval(() => {
      try {
        this.refreshStatus();
      } catch (error){
        this.log.error('Failed to refresh status: ', this.config.name);
      }
    }, 10000);
  }

  // Refresh status
  refreshStatus() {
    this.log.info('Refreshing home status: ', this.config.name);
    this.netatmoAPI.getHomeDevices().then((status) => {
      this.log.info('Home status: ' + status);
      this.status = status;
      this.log.info('Refreshed home status: ', this.config.name);
    });
  }

}
