import { IsNotEmpty, IsString } from 'class-validator';

export class StartSessionDto {
  @IsString()
  @IsNotEmpty()
  clientName: string;
}
