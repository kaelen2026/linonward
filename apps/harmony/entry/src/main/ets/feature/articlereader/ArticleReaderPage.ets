import webview from '@ohos.web.webview';
import { ArticleReaderBridge, BridgeWelcome } from './ArticleReaderBridge';

interface BridgeProtocolPayload {
  major: number;
  minor: number;
}

interface BridgePayload {
  protocol?: BridgeProtocolPayload;
  capabilities?: string[];
}

interface BridgeMessage {
  type: string;
  sessionId?: string;
  payload: BridgePayload;
}

interface WelcomePayload {
  protocol: BridgeProtocolPayload;
  capabilities: string[];
}

interface WelcomeMessage {
  type: string;
  sessionId: string;
  payload: WelcomePayload;
}

interface ArticleContent {
  id: string;
  title: string;
  contentHtml: string;
}

interface ArticleSettings {
  theme: string;
  locale: string;
}

interface ArticlePayload {
  article: ArticleContent;
  settings: ArticleSettings;
}

interface ArticleMessage {
  type: string;
  sessionId: string;
  payload: ArticlePayload;
}

class ArticleReaderProxy {
  private bridge: ArticleReaderBridge = new ArticleReaderBridge();
  private controller: webview.WebviewController;

  constructor(controller: webview.WebviewController) {
    this.controller = controller;
  }

  postMessage(raw: string): void {
    if (raw.length > 1000000) {
      return;
    }
    const message: BridgeMessage = JSON.parse(raw) as BridgeMessage;
    if (message.type === 'bridge:hello') {
      const protocol = message.payload.protocol;
      const capabilities = message.payload.capabilities;
      if (protocol === undefined || capabilities === undefined) {
        return;
      }
      const sessionId = `${Date.now()}-linonward-harmony-session`;
      const welcome = this.bridge.negotiate(
        protocol.major,
        protocol.minor,
        capabilities,
        sessionId
      );
      this.sendWelcome(welcome);
      return;
    }
    if (!this.bridge.accepts(message.type, message.sessionId ?? '', raw.length)) {
      return;
    }
    if (message.type === 'reader:ready') {
      this.sendArticle(message.sessionId ?? '');
    }
  }

  private sendWelcome(welcome: BridgeWelcome): void {
    const message: WelcomeMessage = {
      type: 'bridge:welcome',
      sessionId: welcome.sessionId,
      payload: {
        protocol: { major: welcome.major, minor: welcome.minor },
        capabilities: welcome.capabilities
      }
    };
    this.send(JSON.stringify(message));
  }

  private sendArticle(sessionId: string): void {
    const message: ArticleMessage = {
      type: 'article:set',
      sessionId: sessionId,
      payload: {
        article: {
          id: 'harmony-preview',
          title: 'LinOnward Hybrid',
          contentHtml: '<p>The HarmonyOS container is using the bundled LinOnward reader.</p>'
        },
        settings: { theme: 'system', locale: 'en' }
      }
    };
    this.send(JSON.stringify(message));
  }

  private send(serialized: string): void {
    const argument = JSON.stringify(serialized);
    this.controller.runJavaScript(`window.LinOnward.receive(${argument})`).catch(() => {});
  }
}

@Component
export struct ArticleReaderPage {
  onClose: () => void = () => {};
  private controller: webview.WebviewController = new webview.WebviewController();
  private proxy: ArticleReaderProxy = new ArticleReaderProxy(this.controller);

  build() {
    Column() {
      Row() {
        Button($r('app.string.reader_close'))
          .onClick(this.onClose)
          .id('reader.close')
      }
      .width('100%')
      .padding(12)

      Web({
        src: $rawfile('hybrid/article-reader/index.html'),
        controller: this.controller
      })
        .javaScriptAccess(true)
        .fileAccess(false)
        .domStorageAccess(false)
        .mixedMode(MixedMode.None)
        .javaScriptProxy({
          object: this.proxy,
          name: 'LinOnwardBridge',
          methodList: ['postMessage'],
          controller: this.controller
        })
        .onRenderExited(() => {
          this.onClose();
        })
        .width('100%')
        .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.page_background'))
  }
}
