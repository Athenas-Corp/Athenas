import { Controller, Post, Body } from '@nestjs/common';
import { WhatsAppService } from '../services/whatsapp.service';
import { StartSessionDto } from '../dto/start-session.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { CreateSessionDto } from '../dto/create-session.dto';

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

  @Post('createSesson')
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
  ): Promise<{ sessionId: string }> {
    const sessionId = await this.whatsappService.createNewSession(
      createSessionDto.clientName,
    );
    return { sessionId };
  }
}
