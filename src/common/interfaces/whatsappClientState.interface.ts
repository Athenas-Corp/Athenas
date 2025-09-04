export interface IWhatsAppClientState {
  clientName: string;
  status:
    | 'initializing'
    | 'qr_pending'
    | 'connected'
    | 'disconnected'
    | 'error';
  lastActivity: string;
  connectionAttempts: number;
  clientInfo?: {
    wid?: string;
    platform?: string;
  };
}
