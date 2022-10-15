/* eslint-disable @typescript-eslint/no-explicit-any */
import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { TagSensorAccessory } from './accessory/tagSensorAccessory';
import NetatmoAPI from './util/NetatmoAPI';

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

    if (accessory.context.device.type !== 'NACamDoorTag') {
      this.log.warn('Device type not supported: ' + accessory.context.device.type);
      return;
    }

    this.log.info('Loading accessory from cache:', accessory.displayName);
    new TagSensorAccessory(this, accessory);
    this.accessories.push(accessory);
  }

  // Load devices
  discoverDevices() {
    this.netatmoAPI.getHomeDevices().then((devices) => {
      for (const device of devices) {

        if (device.type !== 'NACamDoorTag') {
          this.log.debug('Device type not supported: ' + device.type);
          continue;
        }

        const uuid = this.api.hap.uuid.generate(device.id);
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

        if (existingAccessory) {
          this.log.info('Existing accessory discovered:', existingAccessory.displayName);
          this.configureAccessory(existingAccessory);
          existingAccessory.context.device = device;

        } else {
          this.log.info('Adding newly discovered accessory:', device.name);
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
    this.refreshStatus();
    setInterval(() => {
      try {
        this.refreshStatus();
      } catch (error){
        this.log.error('Failed to refresh status: ', this.config.name);
      }
    }, 20000);
  }

  // Refresh status
  refreshStatus() {
    this.discoverDevices();
  }

}
