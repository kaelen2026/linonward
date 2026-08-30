import { describe, expect, it } from '@ohos/hypium';
import {
  HybridOfflineManifest,
  HybridReleaseChannel,
  validateChannel,
  validateManifest
} from '../main/ets/feature/articlereader/HybridBundleUpdater';

const ARTIFACT_VERSION: string = 'fb76ea72c3978ad18fa1490f59eb2acb897ccc541948383adccceeb1929e5c61';
const ASSET_HASH: string = 'dead39fb4e60766bee3f34cfdbd2a3208f576b6242c12a75aff3a09ee313a56e';

function manifest(protocolMajor: number = 1): HybridOfflineManifest {
  return {
    artifactVersion: ARTIFACT_VERSION,
    entrypoint: 'index.html',
    files: [{ path: 'index.html', sha256: ASSET_HASH, size: 22 }],
    protocol: { major: protocolMajor, minor: 0 },
    schemaVersion: 1
  };
}

export default function hybridBundleUpdaterTest() {
  describe('HybridBundleUpdater', () => {
    it('rejects another bridge major', 0, async () => {
      let message: string = '';
      try {
        await validateManifest(manifest(2), ARTIFACT_VERSION);
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).assertEqual('hybrid_incompatible_protocol');
    });

    it('rejects an insecure channel', 0, () => {
      const channel: HybridReleaseChannel = {
        artifactVersion: ARTIFACT_VERSION,
        manifestUrl: `http://cdn.example.com/releases/${ARTIFACT_VERSION}/hybrid-manifest.json`,
        releaseName: '2026.08.30.1',
        rolloutPercentage: 100,
        schemaVersion: 1
      };
      let message: string = '';
      try {
        validateChannel(channel, 'https://cdn.example.com/channels/production.json', '1.0.0', 'seed');
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).assertEqual('hybrid_invalid_channel');
    });
  });
}
