import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AgendamentosModule } from './agendamentos/agendamentos.module';
import { SocketModule } from './socket/socket.module';
import { RedisModule } from './redis/redis.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';

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
    WhatsAppModule,
    AgendamentosModule,
    SocketModule,
    RedisModule,
  ],
})
export class AppModule {}
