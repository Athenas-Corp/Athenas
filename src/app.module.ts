import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import mongooseConfig from './config/mongoose.config';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsAppModule } from './whats-app/whats-app.module';
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

    WhatsAppModule,
  ],
})
export class AppModule {}
