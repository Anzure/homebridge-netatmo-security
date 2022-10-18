/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { NetatmoSecurityPlatform } from '../platform';

export class TagSensorAccessory {
  private service: Service;
  private state = {
    SensorStatus: 'unknown',
    TamperStatus: 0,
  };

  // Load device
  constructor(
    private readonly platform: NetatmoSecurityPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Netatmo-Security')
      .setCharacteristic(this.platform.Characteristic.Model, 'Tag-Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.id);

    this.service = this.accessory.getService(this.platform.Service.ContactSensor)
    || this.accessory.addService(this.platform.Service.ContactSensor);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.name);

    this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.isOpen.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.StatusTampered)
      .onGet(this.isTampered.bind(this));

    setInterval(() => {
      try {
        const contactDetected = this.accessory.context.device.status === 'open';

        if (this.accessory.context.device.status !== this.state.SensorStatus) {
          this.platform.log.info(accessory.displayName + ' Sensor Status: ' + contactDetected + ' (' + this.state.SensorStatus + ' -> ' + this.accessory.context.device.status + ')');
        }

        this.state.SensorStatus = this.accessory.context.device.status;
        this.service.updateCharacteristic(this.platform.Characteristic.ContactSensorState, contactDetected);

      } catch (error) {
        this.platform.log.error('Failed to update contact sensor status', error);
      }

      try {
        const timeTampered = this.accessory.context.device.activity ? this.accessory.context.device.activity : 0;
        const minimumTime = (new Date().getTime() / 1000) - 90;
        const tamperingDetected = timeTampered > this.state.TamperStatus || timeTampered > minimumTime;

        if (this.accessory.context.device.activity !== this.state.TamperStatus) {
          this.platform.log.info(accessory.displayName + ' Tampered Status: ' + tamperingDetected + ' (' + this.state.TamperStatus + ' -> ' + this.accessory.context.device.activity + ')');
        } else if (tamperingDetected === true) {
          this.platform.log.debug(accessory.displayName + ' Tampered Status: ' + tamperingDetected + ' (' + this.state.TamperStatus + ' -> ' + this.accessory.context.device.activity + ')');
        }

        this.state.TamperStatus = this.accessory.context.device.activity;
        this.service.updateCharacteristic(this.platform.Characteristic.StatusTampered, tamperingDetected);

      } catch (error) {
        this.platform.log.error('Failed to update tampered sensor status', error);
      }
    }, 5000);
  }

  async isTampered(): Promise<CharacteristicValue> {
    const minimumTime = (new Date().getTime() / 1000) - 90;
    const isTampered = this.state.TamperStatus > minimumTime || this.accessory.context.device.activity > minimumTime;
    this.platform.log.debug(this.accessory.displayName + ' Tampered Characteristic: ' + isTampered + ' (' + this.state.TamperStatus + ' / ' + this.accessory.context.device.activity + ')');
    return isTampered;
  }

  async isOpen(): Promise<CharacteristicValue> {
    const isOpen = this.state.SensorStatus === 'open' || this.accessory.context.device.status === 'open';
    this.platform.log.debug(this.accessory.displayName + ' Sensor Characteristic: ' + isOpen + ' (' + this.state.SensorStatus + ' / ' + this.accessory.context.device.status + ')');
    return isOpen;
  }

}
