import { IsString, MinLength } from 'class-validator';

export class UpdateClientNameDto {
  @IsString()
  @MinLength(1)
  oldClientName: string;

  @IsString()
  @MinLength(1)
  newClientName: string;
}
