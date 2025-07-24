import { Controller, Get, Param } from '@nestjs/common';
import { WhatsAppService } from './whats-app.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('start/:sessionId')
  async startSession(
    @Param('sessionId') sessionId: string,
  ): Promise<{ status: string; sessionId: string }> {
    await this.whatsappService.startSession(sessionId);
    return { status: 'iniciando', sessionId };
  }

  @Get('sessions')
  listSessions(): ReturnType<WhatsAppService['listSessions']> {
    return this.whatsappService.listSessions();
  }
}
