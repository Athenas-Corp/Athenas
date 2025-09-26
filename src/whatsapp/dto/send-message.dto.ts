import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  clientName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+\d{10,15}$/, {
    message: 'Número deve estar no formato internacional, ex: +5511999999999',
  })
  number: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
