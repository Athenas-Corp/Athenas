import { Module } from '@nestjs/common';
<<<<<<< HEAD
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsAppModule } from './whatsapp/modules/whatsapp.module';
import { AgendamentosModule } from './agendamentos/agendamentos.module';
import { SocketModule } from './socket/socket.module';
import { RedisModule } from './redis/redis.module';
import { EventsModule } from './events/events.module';
import { HandleWhatsAppClientModule } from './handle-whata-app-client/handle-whata-app-client.module';

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
    EventsModule,
    HandleWhatsAppClientModule,
  ],
=======
import { AppService } from './app.service';

@Module({
  providers: [AppService],
  controllers: [],
  imports: [],
  exports: [],
>>>>>>> 0098d19 (sdf)
})
export class AppModule {}
