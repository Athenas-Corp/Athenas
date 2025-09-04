import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { WhatsAppService } from './whatsapp.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    // credentials: true,
  },
})
export class WhatsAppGateway {
  private readonly logger: Logger;
  constructor(private readonly whatsappService: WhatsAppService) {
    this.logger = new Logger(WhatsAppGateway.name);
  }

  @WebSocketServer()
  io: Server;
}
