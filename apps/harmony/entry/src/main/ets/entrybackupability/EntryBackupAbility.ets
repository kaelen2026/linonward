import { BackupExtensionAbility, BundleVersion } from '@kit.CoreFileKit';
import { hilog } from '@kit.PerformanceAnalysisKit';

const DOMAIN: number = 0x0000;
const TAG: string = 'LinOnward';

/**
 * Declared because `backup_config.json` opts the app into system backup. The app
 * stores nothing of its own yet, so both hooks only record that they ran.
 */
export default class EntryBackupAbility extends BackupExtensionAbility {
  async onBackup(): Promise<void> {
    hilog.info(DOMAIN, TAG, '%{public}s', 'onBackup');
  }

  async onRestore(bundleVersion: BundleVersion): Promise<void> {
    hilog.info(DOMAIN, TAG, 'onRestore from %{public}s', JSON.stringify(bundleVersion));
  }
}
