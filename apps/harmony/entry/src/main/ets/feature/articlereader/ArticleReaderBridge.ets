export const HYBRID_PROTOCOL_MAJOR: number = 1;
export const HYBRID_PROTOCOL_MINOR: number = 0;
export const HYBRID_MAX_MESSAGE_BYTES: number = 1000000;

export interface BridgeWelcome {
  sessionId: string;
  major: number;
  minor: number;
  capabilities: string[];
}

export class ArticleReaderBridge {
  private sessionId: string = '';

  negotiate(major: number, minor: number, offeredCapabilities: string[], sessionId: string): BridgeWelcome {
    if (major !== HYBRID_PROTOCOL_MAJOR || minor < 0 || !Number.isInteger(minor)) {
      throw new Error('PROTOCOL_MISMATCH');
    }
    if (sessionId.length < 16 || sessionId.length > 128) {
      throw new Error('INVALID_SESSION');
    }
    this.sessionId = sessionId;
    return {
      sessionId: sessionId,
      major: HYBRID_PROTOCOL_MAJOR,
      minor: Math.min(minor, HYBRID_PROTOCOL_MINOR),
      capabilities: offeredCapabilities.filter((capability: string) =>
        SUPPORTED_CAPABILITIES.includes(capability)
      )
    };
  }

  accepts(type: string, sessionId: string, messageBytes: number): boolean {
    return messageBytes <= HYBRID_MAX_MESSAGE_BYTES &&
      sessionId === this.sessionId &&
      ACCEPTED_MESSAGES.includes(type);
  }
}

const SUPPORTED_CAPABILITIES: string[] = [
  'article.set',
  'reader.settings',
  'reader.height',
  'article.link',
  'article.image'
];

const ACCEPTED_MESSAGES: string[] = [
  'reader:ready',
  'reader:height',
  'reader:error',
  'article:link',
  'article:image'
];
