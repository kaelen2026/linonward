import { describe, expect, it } from '@ohos/hypium';
import { isApiConfigured, resolveApiEndpoint } from '../main/ets/config/ApiEndpoint';

export default function apiEndpointTest() {
  describe('ApiEndpoint', () => {
    it('treats a release build with no origin as unconfigured', 0, () => {
      expect(isApiConfigured('')).assertFalse();
      expect(isApiConfigured('   ')).assertFalse();
      expect(isApiConfigured('http://localhost:3001')).assertTrue();
    });

    it('joins an origin and a path with exactly one slash', 0, () => {
      expect(resolveApiEndpoint('http://localhost:3001', '/health')).assertEqual(
        'http://localhost:3001/health'
      );
      expect(resolveApiEndpoint('http://localhost:3001/', '/health')).assertEqual(
        'http://localhost:3001/health'
      );
      expect(resolveApiEndpoint('http://localhost:3001', 'health')).assertEqual(
        'http://localhost:3001/health'
      );
    });

    it('refuses to build a URL when the build carries no origin', 0, () => {
      let threw: boolean = false;
      try {
        resolveApiEndpoint('', '/health');
      } catch (error) {
        threw = true;
      }
      expect(threw).assertTrue();
    });
  });
}
