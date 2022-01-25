import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { NetatmoSecurityPlatform } from '../platform';

export class TagSensorAccessory {
  private service: Service;
  private exampleStates = {
    On: false,
    Brightness: 100,
  };

  // Load device
  constructor(
    private readonly platform: NetatmoSecurityPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.exampleDisplayName);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this));

    const motionSensorOneService = this.accessory.getService('Motion Sensor One Name') ||
      this.accessory.addService(this.platform.Service.MotionSensor, 'Motion Sensor One Name', 'YourUniqueIdentifier-1');

    const motionSensorTwoService = this.accessory.getService('Motion Sensor Two Name') ||
      this.accessory.addService(this.platform.Service.MotionSensor, 'Motion Sensor Two Name', 'YourUniqueIdentifier-2');

    let motionDetected = false;
    setInterval(() => {

      motionDetected = !motionDetected;

      motionSensorOneService.updateCharacteristic(this.platform.Characteristic.MotionDetected, motionDetected);
      motionSensorTwoService.updateCharacteristic(this.platform.Characteristic.MotionDetected, !motionDetected);

      this.platform.log.debug('Triggering motionSensorOneService:', motionDetected);
      this.platform.log.debug('Triggering motionSensorTwoService:', !motionDetected);
    }, 10000);
  }

  async setOn(value: CharacteristicValue) {
    this.exampleStates.On = value as boolean;
    this.platform.log.debug('Set Characteristic On ->', value);
  }

  async getOn(): Promise<CharacteristicValue> {
    const isOn = this.exampleStates.On;
    this.platform.log.debug('Get Characteristic On ->', isOn);
    return isOn;
  }

  async setBrightness(value: CharacteristicValue) {
    this.exampleStates.Brightness = value as number;
    this.platform.log.debug('Set Characteristic Brightness -> ', value);
  }

}
