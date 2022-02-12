/* eslint-disable @typescript-eslint/no-explicit-any */
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { NetatmoSecurityPlatform } from '../platform';

export class IndoorSirenAccessory {
  private service: Service;
  private state = {
    id: '',
    on: false,
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
      .setCharacteristic(this.platform.Characteristic.Model, 'Indoor-Siren')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.state.id);

    this.service = this.accessory.getService(this.platform.Service.SmartSpeaker)
    || this.accessory.addService(this.platform.Service.SmartSpeaker);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.name);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    setInterval(() => {

      if (this.platform.status === null || this.platform.status === undefined){
        return;
      }

      const device: Record<string, any> = this.platform.status.find((device) => device.id === this.state.id);

      try {
        if ((this.state.on && device.status === 'no_sound') || (!this.state.on && device.status !== 'no_sound')){
          const sound = this.state.on ? 'warning' : 'no_sound';
          this.platform.netatmoAPI.setState(device, sound).then(() => {
            this.platform.log.info('Triggering indoorSirenService: ' + sound + ' (' + this.state.on + ')');
          });
          this.service.updateCharacteristic(this.platform.Characteristic.On, this.state.on);
        }
      } catch (error){
        this.platform.log.info('Failing indoorSirenService', error);
      }

      try {
        if (device.activity !== null && device.activity !== undefined) {
          if (device.activity !== this.state.activity && device.activity > 0){
            const minimumTime = (new Date().getTime() / 1000) - 90;
            const obstructionDetected = device.activity > this.state.activity && device.activity > minimumTime;
            this.state.activity = device.activity;
            this.service.updateCharacteristic(this.platform.Characteristic.ObstructionDetected, obstructionDetected);
            const timePassed = device.activity - this.state.activity;
            this.platform.log.info('Triggering obstructionSensorService: ' + obstructionDetected + ' (' + timePassed + ')');
          }
        }
      } catch (error){
        this.platform.log.info('Failing obstructionSensorService', error);
      }

    }, 10000);
  }

  async setOn(value: CharacteristicValue) {
    this.state.on = value as boolean;
    this.platform.log.debug('Set Characteristic On ->', value);
  }

  async getOn(): Promise<CharacteristicValue> {
    const isOp = this.state.on;
    this.platform.log.info('Get Characteristic IndoorSirenState ->', isOp);
    return isOp;
  }

}
