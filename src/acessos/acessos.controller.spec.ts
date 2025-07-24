import { Test, TestingModule } from '@nestjs/testing';
import { AcessosController } from './acessos.controller';
import { AcessosService } from './acessos.service';

describe('AcessosController', () => {
  let controller: AcessosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AcessosController],
      providers: [AcessosService],
    }).compile();

    controller = module.get<AcessosController>(AcessosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
