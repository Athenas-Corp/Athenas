import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';

import { AgendamentosService } from './agendamentos.service';
import { AgendamentosController } from './agendamentos.controller';
import {
  Agendamento,
  AgendamentoSchema,
} from 'src/models/schemas/AgendamentosSchema/agendamentos.schema';
import { AgendamentosProcessor } from './agendamentos.processor';
import { WhatsAppModule } from 'src/whatsapp/modules/whatsapp.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'agendamentos' }),

    MongooseModule.forFeature([
      { name: Agendamento.name, schema: AgendamentoSchema },
    ]),
    WhatsAppModule,
  ],
  controllers: [AgendamentosController],
  providers: [AgendamentosService, AgendamentosProcessor],
  exports: [AgendamentosService],
})
export class AgendamentosModule {}
