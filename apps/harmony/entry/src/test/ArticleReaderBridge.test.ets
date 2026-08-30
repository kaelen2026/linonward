import { describe, expect, it } from '@ohos/hypium';
import {
  ArticleReaderBridge,
  HYBRID_MAX_MESSAGE_BYTES
} from '../main/ets/feature/articlereader/ArticleReaderBridge';

export default function articleReaderBridgeTest() {
  describe('ArticleReaderBridge', () => {
    it('negotiates the shared minor and known capabilities', 0, () => {
      const bridge = new ArticleReaderBridge();
      const welcome = bridge.negotiate(
        1,
        4,
        ['article.set', 'future.capability'],
        '12345678-1234-1234-1234-123456789abc'
      );

      expect(welcome.minor).assertEqual(0);
      expect(welcome.capabilities.length).assertEqual(1);
      expect(welcome.capabilities[0]).assertEqual('article.set');
      expect(bridge.accepts('reader:ready', welcome.sessionId, 200)).assertTrue();
    });

    it('rejects incompatible versions, stale sessions, and oversized messages', 0, () => {
      const bridge = new ArticleReaderBridge();
      let mismatch: boolean = false;
      try {
        bridge.negotiate(2, 0, [], '12345678-1234-1234-1234-123456789abc');
      } catch (error) {
        mismatch = true;
      }
      expect(mismatch).assertTrue();

      const welcome = bridge.negotiate(1, 0, [], '12345678-1234-1234-1234-123456789abc');
      expect(bridge.accepts('reader:ready', 'stale-session-id', 200)).assertFalse();
      expect(
        bridge.accepts('reader:ready', welcome.sessionId, HYBRID_MAX_MESSAGE_BYTES + 1)
      ).assertFalse();
    });
  });
}
