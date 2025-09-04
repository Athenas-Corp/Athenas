import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    // credentials: true,
  },
})
export class SocketGateway {
  private readonly logger = new Logger(SocketGateway.name);

  @WebSocketServer()
  server: Server;

  emit(channel: string, data: object): void {
    if (!this.server) {
      this.logger.warn(
        `Server não inicializado. Não foi possível emitir evento "${channel}"`,
      );
      return;
    }

    this.server.emit(channel, data);
  }
}
