import apiEndpointTest from './ApiEndpoint.test';
import articleReaderBridgeTest from './ArticleReaderBridge.test';
import articleModelsTest from './ArticleModels.test';

export default function testsuite() {
  apiEndpointTest();
  articleReaderBridgeTest();
  articleModelsTest();
}
