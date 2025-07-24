import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateMensagemDto } from './dtos/create-mensagem.dto';
import { MessagesService } from './messagem.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async criar(@Body() dto: CreateMensagemDto) {
    return this.messagesService.criar(dto);
  }

  @Get()
  async listar() {
    return this.messagesService.listar();
  }
}
