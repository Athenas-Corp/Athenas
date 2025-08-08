import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { WhatsAppModule } from './whatsapp/modules/whatsapp.module';
import { AgendamentosModule } from './agendamentos/agendamentos.module';
import { AutoAtendimentoModule } from './auto-atendimento/auto-atendimento.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI');
        return {
          uri,
        };
      },
    }),
    ScheduleModule.forRoot(),
    WhatsAppModule,
    AgendamentosModule,
    AutoAtendimentoModule,
  ],
})
export class AppModule {}
