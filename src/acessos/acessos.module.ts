import { Module } from '@nestjs/common';
import { AcessosService } from './acessos.service';
import { AcessosController } from './acessos.controller';

@Module({
  controllers: [AcessosController],
  providers: [AcessosService],
})
export class AcessosModule {}
