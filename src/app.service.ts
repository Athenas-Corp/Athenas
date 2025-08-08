import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor() {}

  returnHelloWord(): string {
    return 'hello word';
  }
}
