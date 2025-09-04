export class StartSessionDto {
  @IsString()
  @IsNotEmpty()
  clientName: string;

}
