import { PartialType } from '@nestjs/mapped-types';
import { CreateDisparadorDto } from './create-disparador.dto';

export class UpdateDisparadorDto extends PartialType(CreateDisparadorDto) {}
