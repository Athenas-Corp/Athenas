import { MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

export const mongooseConfig = {
  useFactory: (configService: ConfigService): MongooseModuleOptions => ({
    uri: configService.get<string>('MONGO_URI'),
  }),
  inject: [ConfigService],
};
