export interface WhatsAppSessionData {
  WABrowserId: string;
  WASecretBundle: {
    keyData: string;
  };
  WAToken1: string;
  WAToken2: string;
}

export interface WhatsAppSession {
  sessionId: string;
  sessionData: WhatsAppSessionData;
  status: string;
}
