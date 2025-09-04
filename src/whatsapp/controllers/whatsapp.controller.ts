import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  Put,
} from '@nestjs/common';
import { WhatsAppService } from '../services/whatsapp.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import { SessionResponseDto } from '../dto/session-response.dto';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('createSession')
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
  ): Promise<{ status: string; clientName?: string; error?: string }> {
    return this.whatsappService.createClient(createSessionDto.clientName);
  }
  @Get('clients')
  async getAllSessions(): Promise<SessionResponseDto[]> {
    return this.whatsappService.findAllSessions();
  }
  @Get('clients/:clientName')
  async startSession(@Param('clientName') clientName: string): Promise<void> {
    return this.whatsappService.connectClient(clientName);
  }

  @Delete('client/:clientName')
  async deleteSession(
    @Param('clientName') clientName: string,
  ): Promise<{ status: string }> {
    await this.whatsappService.deleteSession(clientName);
    return { status: `Sessão ${clientName} deletada com sucesso` };
  }

  @Put('update-client/:oldClientName')
  async updateCleint(
    @Param('oldClientName') oldClientName: string,
    @Body('newclientName') newclientName: string,
  ): Promise<{ status: string; clientName?: string }> {
    return this.whatsappService.updateClientName(oldClientName, newclientName);
  }

  // @Get('clients/:clientName')
  // async startSession(@Param('teste1') clientName: string): Promise<void> {
  //   return this.whatsappService.ClientReady();
  // }
}
