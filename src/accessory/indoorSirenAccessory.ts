/* eslint-disable @typescript-eslint/no-explicit-any */
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { NetatmoSecurityPlatform } from '../platform';

export class IndoorSirenAccessory {
  private service: Service;
  private state = {
    SoundStatus: 'no_sound',
    TamperStatus: 0,
  };

  // Load device
  constructor(
    private readonly platform: NetatmoSecurityPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Netatmo-Security')
      .setCharacteristic(this.platform.Characteristic.Model, 'Indoor-Siren')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.id);

    this.service = this.accessory.getService(this.platform.Service.Speaker)
    || this.accessory.addService(this.platform.Service.Speaker);

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.name);

    this.service.getCharacteristic(this.platform.Characteristic.Mute)
      /*.onSet(this.setMuted.bind(this))*/
      .onGet(this.isMuted.bind(this));

    setInterval(() => {
      try {
        const soundDetected = this.accessory.context.device.status !== 'no_sound';

        if (this.accessory.context.device.status !== this.state.SoundStatus) {
          this.platform.log.info(accessory.displayName + ' Sound Status: ' + soundDetected + ' (' + this.state.SoundStatus + ' -> ' + this.accessory.context.device.status + ')');
        }

        this.state.SoundStatus = this.accessory.context.device.status;
        this.service.updateCharacteristic(this.platform.Characteristic.Mute, !soundDetected);

      } catch (error) {
        this.platform.log.error('Failed to update siren sound status', error);
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

      } catch (error){
        this.platform.log.error('Failed to update tampered sensor status', error);
      }

    }, 5000);
  }

  /*async setMuted(value: CharacteristicValue) {
    const sound = value ? 'no_sound' : 'warning';
    this.platform.log.info(this.accessory.displayName + ' Sound Characteristic: ' + sound + ' (' + this.state.SoundStatus + ' / ' + this.accessory.context.device.status + ')');
    this.platform.netatmoAPI.setState(this.accessory.context.device, sound).then(() => {
      this.state.SoundStatus = sound;
      this.service.updateCharacteristic(this.platform.Characteristic.Mute, value);
    });
  }*/

  async isMuted(): Promise<CharacteristicValue> {
    const playing = this.state.SoundStatus === 'no_sound' && this.accessory.context.device.status === 'no_sound';
    this.platform.log.debug(this.accessory.displayName + ' Sound Characteristic: ' + playing + ' (' + this.state.SoundStatus + ' / ' + this.accessory.context.device.status + ')');
    return playing;
  }

}