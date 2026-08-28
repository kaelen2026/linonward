import { abilityDelegatorRegistry, Driver, ON } from '@kit.TestKit';
import { beforeAll, describe, expect, it } from '@ohos/hypium';

const delegator = abilityDelegatorRegistry.getAbilityDelegator();
const bundleName = abilityDelegatorRegistry.getArguments().bundleName;

export default function abilityTest() {
  describe('EntryAbility', () => {
    beforeAll(async (done: Function) => {
      await delegator.startAbility({ bundleName: bundleName, abilityName: 'EntryAbility' });
      done();
    });

    it('shows the home headline on launch', 0, async (done: Function) => {
      const driver: Driver = Driver.create();
      await driver.delayMs(1000);
      const title = await driver.findComponent(ON.id('home.title'));
      expect(title !== null).assertTrue();
      done();
    });

    it('names the server this build talks to', 0, async (done: Function) => {
      const driver: Driver = Driver.create();
      await driver.delayMs(1000);
      const endpoint = await driver.findComponent(ON.id('home.api'));
      expect(endpoint !== null).assertTrue();
      done();
    });
  });
}
