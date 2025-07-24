import { PartialType } from '@nestjs/mapped-types';
import { CreateAcessoDto } from './create-acesso.dto';

export class UpdateAcessoDto extends PartialType(CreateAcessoDto) {}
