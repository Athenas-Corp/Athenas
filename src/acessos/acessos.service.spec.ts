import { Test, TestingModule } from '@nestjs/testing';
import { AcessosService } from './acessos.service';

describe('AcessosService', () => {
  let service: AcessosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AcessosService],
    }).compile();

    service = module.get<AcessosService>(AcessosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
