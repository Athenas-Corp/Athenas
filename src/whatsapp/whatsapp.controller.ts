// src/whatsapp/whatsapp.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { StartSessionDto } from './dto/start-session.dto';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('start')
  async startSession(
    @Body() body: StartSessionDto,
  ): Promise<{ status: string; sessionId: string }> {
    return this.whatsappService.startSession(body.sessionId);
  }
}
