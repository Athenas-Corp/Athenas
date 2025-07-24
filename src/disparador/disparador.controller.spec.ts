import { Test, TestingModule } from '@nestjs/testing';
import { DisparadorController } from './disparador.controller';
import { DisparadorService } from './disparador.service';

describe('DisparadorController', () => {
  let controller: DisparadorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisparadorController],
      providers: [DisparadorService],
    }).compile();

    controller = module.get<DisparadorController>(DisparadorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
