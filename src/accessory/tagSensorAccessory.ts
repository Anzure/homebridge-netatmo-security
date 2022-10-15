/* eslint-disable @typescript-eslint/no-explicit-any */
import { Service, PlatformAccessory, CharacteristicValue, Nullable } from 'homebridge';
import { NetatmoSecurityPlatform } from '../platform';

export class TagSensorAccessory {
  private service: Service;
  private state = {
    ContactSensorStatus: '',
    ObstructionDetected: 0,
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
      .onGet(this.getOpen.bind(this));

    /*const vibration = this.accessory.getService(this.platform.Service.MotionSensor)
      || this.accessory.addService(this.platform.Service.MotionSensor);
    vibration.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.name + ' Vibration Sensor');*/

    setInterval(() => {
      try {
        this.platform.log.debug('Contact sensor status for ' + accessory.displayName + ' accessory: ' + this.accessory.context.device.status + ' (' + this.state.ContactSensorStatus + ')');
        const contactDetected = this.accessory.context.device.status === 'open';
        if (this.accessory.context.device.status !== this.state.ContactSensorStatus) {
          this.platform.log.info('Triggering contactSensorService:' + contactDetected + ' (' + this.accessory.context.device.status + ')');
        }
        this.state.ContactSensorStatus = this.accessory.context.device.status;
        this.service.updateCharacteristic(this.platform.Characteristic.ContactSensorState, contactDetected);
      } catch (error) {
        this.platform.log.info('Failing contactSensorService', error);
      }

      /*try {
        this.platform.log.debug('Vibration sensor status for ' + accessory.displayName + ' accessory: ' + this.accessory.context.device.activity + ' (' + this.state.ObstructionDetected + ')');
        if (this.accessory.context.device.activity !== null && this.accessory.context.device.activity !== undefined) {
          if (this.accessory.context.device.activity !== this.state.ObstructionDetected && this.accessory.context.device.activity > 0) {
            const minimumTime = (new Date().getTime() / 1000) - 90;
            const vibrationDetected = this.accessory.context.device.activity > this.state.ObstructionDetected && this.accessory.context.device.activity > minimumTime;
            const timePassed = this.accessory.context.device.activity - this.state.ObstructionDetected;
            this.platform.log.info('Triggering vibrationSensorService: ' + vibrationDetected + ' (' + timePassed + ')');
            this.state.ObstructionDetected = this.accessory.context.device.activity;
            vibration.updateCharacteristic(this.platform.Characteristic.ObstructionDetected, vibrationDetected);
          }
        }
      } catch (error) {
        this.platform.log.info('Failing vibrationSensorService', error);
      }*/

    }, 30000);
  }

  async getOpen(): Promise<CharacteristicValue> {
    const isOpen = this.state.ContactSensorStatus === 'open' || this.accessory.context.device.status === 'open';
    this.platform.log.debug('Get Characteristic ContactSensorState -> ' + this.state.ContactSensorStatus + ' (' + this.accessory.context.device.status + ')');
    return isOpen;
  }

}
