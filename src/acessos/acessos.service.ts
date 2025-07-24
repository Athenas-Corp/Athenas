import { Injectable } from '@nestjs/common';
import { CreateAcessoDto } from './dto/create-acesso.dto';
import { UpdateAcessoDto } from './dto/update-acesso.dto';

@Injectable()
export class AcessosService {
  create(createAcessoDto: CreateAcessoDto) {
    return 'This action adds a new acesso';
  }

  findAll() {
    return `This action returns all acessos`;
  }

  findOne(id: number) {
    return `This action returns a #${id} acesso`;
  }

  update(id: number, updateAcessoDto: UpdateAcessoDto) {
    return `This action updates a #${id} acesso`;
  }

  remove(id: number) {
    return `This action removes a #${id} acesso`;
  }
}
