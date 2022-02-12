/* eslint-disable @typescript-eslint/no-explicit-any */
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { NetatmoSecurityPlatform } from '../platform';

export class TagSensorAccessory {
  private service: Service;
  private state = {
    id: '',
    status: '',
    activity: 0,
  };

  // Load device
  constructor(
    private readonly platform: NetatmoSecurityPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.state = { ...this.state, id: this.accessory.context.device.id};
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Netatmo-Security')
      .setCharacteristic(this.platform.Characteristic.Model, 'Tag-Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.state.id);

    this.service = this.accessory.getService(this.platform.Service.ContactSensor)
    || this.accessory.addService(this.platform.Service.ContactSensor);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.name);

    this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getOpen.bind(this));

    setInterval(() => {

      if (this.platform.status === null || this.platform.status === undefined){
        return;
      }

      const device: Record<string, any> = this.platform.status.find((device) => device.id === this.state.id);

      try {
        if (device.status !== this.state.status){
          const contactDetected = device.status === 'closed';
          this.service.updateCharacteristic(this.platform.Characteristic.ContactSensorState, contactDetected);
          this.platform.log.info('Triggering contactSensorService:' + contactDetected + ' (' + device.status + ')');
          this.state = { ...this.state, status: device.status};
        }
      } catch (error){
        this.platform.log.info('Failing contactSensorService', error);
      }

      try {
        if (device.activity !== null && device.activity !== undefined) {
          if (device.activity !== this.state.activity && device.activity > 0){
            const minimumTime = (new Date().getTime() / 1000) - 90;
            const vibrationDetected = device.activity > this.state.activity && device.activity > minimumTime;
            this.state = { ...this.state, activity: device.activity};
            this.service.updateCharacteristic(this.platform.Characteristic.ObstructionDetected, vibrationDetected);
            const timePassed = device.activity - this.state.activity;
            this.platform.log.info('Triggering vibrationSensorService: ' + vibrationDetected + ' (' + timePassed + ')');
          }
        }
      } catch (error){
        this.platform.log.info('Failing vibrationSensorService', error);
      }

    }, 10000);
  }

  async getOpen(): Promise<CharacteristicValue> {
    const isOpen = this.state.status === 'open';
    this.platform.log.info('Get Characteristic ContactSensorState ->', isOpen);
    return isOpen;
  }

}
