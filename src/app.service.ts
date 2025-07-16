import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private logger = new Logger(AppService.name);

  getHello(): void {
    return this.logger.log('Hello World!');
  }
}
