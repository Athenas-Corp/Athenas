import { Injectable } from '@nestjs/common';
import { CreateDisparadorDto } from './dto/create-disparador.dto';
import { UpdateDisparadorDto } from './dto/update-disparador.dto';

@Injectable()
export class DisparadorService {
  create(createDisparadorDto: CreateDisparadorDto) {
    return 'This action adds a new disparador';
  }

  findAll() {
    return `This action returns all disparador`;
  }

  findOne(id: number) {
    return `This action returns a #${id} disparador`;
  }

  update(id: number, updateDisparadorDto: UpdateDisparadorDto) {
    return `This action updates a #${id} disparador`;
  }

  remove(id: number) {
    return `This action removes a #${id} disparador`;
  }
}
