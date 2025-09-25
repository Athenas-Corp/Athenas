import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';

import { AgendamentosService } from './agendamentos.service';
import { AgendamentosController } from './agendamentos.controller';
import {
  Agendamento,
  AgendamentoSchema,
} from '../models/schemas/AgendamentosSchema/agendamentos.schema';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'agendamentos',
    }),

    MongooseModule.forFeature([
      { name: Agendamento.name, schema: AgendamentoSchema },
    ]),

    WhatsAppModule,
  ],
  controllers: [AgendamentosController],
  providers: [AgendamentosService],
  exports: [AgendamentosService],
})
export class AgendamentosModule {}
