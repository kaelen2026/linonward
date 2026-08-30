import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { window } from '@kit.ArkUI';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { HYBRID_CHANNEL_URL } from '../config/ApiConfiguration';
import {
  HybridBundleStore,
  HybridBundleUpdater,
  hybridRolloutSeed
} from '../feature/articlereader/HybridBundleUpdater';

const DOMAIN: number = 0x0000;
const TAG: string = 'LinOnward';

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(DOMAIN, TAG, 'onCreate launchReason=%{public}d', launchParam.launchReason);
    if (HYBRID_CHANNEL_URL.startsWith('https://')) {
      const cacheDir = this.context.cacheDir;
      hybridRolloutSeed(cacheDir).then((seed: string) => {
        return new HybridBundleUpdater(HybridBundleStore.root(cacheDir))
          .refresh(HYBRID_CHANNEL_URL, '1.0.0', seed);
      }).catch(() => {
        hilog.warn(DOMAIN, TAG, '%{public}s', 'Hybrid release refresh skipped');
      });
    }
  }

  onDestroy(): void {
    hilog.info(DOMAIN, TAG, '%{public}s', 'onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.loadContent('pages/Index', (error: BusinessError) => {
      if (error.code) {
        hilog.error(DOMAIN, TAG, 'Failed to load content: %{public}s', JSON.stringify(error));
        return;
      }
      hilog.info(DOMAIN, TAG, '%{public}s', 'Loaded pages/Index');
    });
  }

  onWindowStageDestroy(): void {
    hilog.info(DOMAIN, TAG, '%{public}s', 'onWindowStageDestroy');
  }

  onForeground(): void {
    hilog.info(DOMAIN, TAG, '%{public}s', 'onForeground');
  }

  onBackground(): void {
    hilog.info(DOMAIN, TAG, '%{public}s', 'onBackground');
  }
}
