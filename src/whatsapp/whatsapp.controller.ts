// src/whatsapp/whatsapp.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('start')
  async startSession(
    @Body() body: StartSessionDto,
  ): Promise<{ status: string; sessionId: string }> {
    return this.whatsappService.startSession(body.sessionId);
  }

  @Post('send')
  async sendMessage(
    @Body() body: SendMessageDto,
  ): Promise<{ status: string; messageId?: string }> {
    return this.whatsappService.sendMessage(
      body.sessionId,
      body.number,
      body.message,
    );
  }
}
