import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMensagemDto {
  @IsString()
  @IsNotEmpty()
  texto: string;
}
