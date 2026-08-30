import apiEndpointTest from './ApiEndpoint.test';
import articleReaderBridgeTest from './ArticleReaderBridge.test';
import articleModelsTest from './ArticleModels.test';
import articleServiceTest from './ArticleService.test';
import hybridBundleUpdaterTest from './HybridBundleUpdater.test';

export default function testsuite() {
  apiEndpointTest();
  articleReaderBridgeTest();
  articleModelsTest();
  articleServiceTest();
  hybridBundleUpdaterTest();
}
