import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import mongooseConfig from './config/mongoose.config';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagesModule } from './messages/messages.module';
import { WhatsAppModule } from './whats-app/whats-app.module';
import { UsersModule } from './users/users.module';
import { DisparadorModule } from './disparador/disparador.module';
import { AcessosModule } from './acessos/acessos.module';
// import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [mongooseConfig],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongoose.uri'),
      }),
    }),

    // RabbitMQModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => ({
    //     uri:
    //       configService.get<string>('rabbitmq.uri') || 'amqp://localhost:5672',
    //     connectionInitOptions: { wait: true },
    //     exchanges: [
    //       {
    //         name: 'athenas-exchange',
    //         type: 'topic',
    //       },
    //     ],
    //   }),
    // }),

    MessagesModule,
    WhatsAppModule,
    UsersModule,
    DisparadorModule,
    AcessosModule,
  ],
})
export class AppModule {}
