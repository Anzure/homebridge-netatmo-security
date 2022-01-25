import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { NetatmoPlatformAccessory } from './accessory/indoorCameraAccessory';

export class NetatmoSecurityPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];

  // Load platform
  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  // Configure device
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  // Load devices
  discoverDevices() {

    const exampleDevices = [
      {
        exampleUniqueId: 'ABCD',
        exampleDisplayName: 'Bedroom',
      },
      {
        exampleUniqueId: 'EFGH',
        exampleDisplayName: 'Kitchen',
      },
    ];

    for (const device of exampleDevices) {

      const uuid = this.api.hap.uuid.generate(device.exampleUniqueId);

      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        new NetatmoPlatformAccessory(this, existingAccessory);

      } else {
        this.log.info('Adding new accessory:', device.exampleDisplayName);

        const accessory = new this.api.platformAccessory(device.exampleDisplayName, uuid);

        accessory.context.device = device;

        new NetatmoPlatformAccessory(this, accessory);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

}
