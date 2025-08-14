import { IsString, IsNotEmpty } from 'class-validator';

export class StartSessionDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
