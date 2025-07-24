import { Controller, Get, Param } from '@nestjs/common';
import { WhatsAppService } from './whats-app.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('start/:sessionId')
  async startSession(@Param('sessionId') sessionId: string) {
    await this.whatsappService.startSession(sessionId);
    return { status: 'iniciando', sessionId };
  }

  @Get('sessions')
  listSessions() {
    return this.whatsappService.listSessions();
  }
}
