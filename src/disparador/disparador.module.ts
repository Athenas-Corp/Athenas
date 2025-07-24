import { Module } from '@nestjs/common';
import { DisparadorService } from './disparador.service';
import { DisparadorController } from './disparador.controller';

@Module({
  controllers: [DisparadorController],
  providers: [DisparadorService],
})
export class DisparadorModule {}
