import { Injectable } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';

@Injectable()
export class WhatsAppClientFactory {
  create(sessionId: string): Client {
    return new Client({
      authStrategy: new LocalAuth({ clientId: sessionId }),
    });
  }
}
