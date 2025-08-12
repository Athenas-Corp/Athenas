import { IsString, IsArray, IsDateString } from 'class-validator';

export class CreateAgendamentoDto {
  @IsString()
  remetente: string;

  @IsArray()
  destinatarios: string[];

  @IsString()
  mensagem: string;

  @IsDateString()
  dataExecucao: string;
}
