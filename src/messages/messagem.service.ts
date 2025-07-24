import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateMensagemDto } from './dtos/create-mensagem.dto';
import { Mensagem } from './entities/mensagem.schema';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Mensagem.name) private readonly mensagemModel: Model<Mensagem>,
  ) {}

  async criar(createMensagemDto: CreateMensagemDto): Promise<Mensagem> {
    const novaMensagem = new this.mensagemModel(createMensagemDto);
    return novaMensagem.save();
  }

  async listar(): Promise<Mensagem[]> {
    return this.mensagemModel.find().sort({ createdAt: -1 }).exec();
  }
}
