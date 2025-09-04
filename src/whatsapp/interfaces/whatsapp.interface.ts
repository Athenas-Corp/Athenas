export interface IWhatsAppSession {
  sessionId: string;
  status: string;
  clientName?: string;
  qrAttempts?: number;
}
