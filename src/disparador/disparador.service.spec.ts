import { Test, TestingModule } from '@nestjs/testing';
import { DisparadorService } from './disparador.service';

describe('DisparadorService', () => {
  let service: DisparadorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DisparadorService],
    }).compile();

    service = module.get<DisparadorService>(DisparadorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
