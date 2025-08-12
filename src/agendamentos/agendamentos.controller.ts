import { Controller, Post, Body } from '@nestjs/common';
import { AgendamentosService } from './agendamentos.service';
import { CreateAgendamentoDto } from './dto/create-agendamento.dto';

@Controller('agendamentos')
export class AgendamentosController {
  constructor(private readonly agendamentosService: AgendamentosService) {}

  @Post('criarAgendamento')
  async criarAgendamento(
    @Body() createAgendamentoDto: CreateAgendamentoDto,
  ): Promise<{ message: string }> {
    return await this.agendamentosService.criarAgendamento(
      createAgendamentoDto,
    );
  }
}
