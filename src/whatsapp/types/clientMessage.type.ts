export interface IClientMessage {
  body: string;
  from: string;
  to: string;
  isMe: boolean;
  clientNumber: string;
  clientName: string;
}
