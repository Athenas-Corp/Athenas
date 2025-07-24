import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AcessosService } from './acessos.service';
import { CreateAcessoDto } from './dto/create-acesso.dto';
import { UpdateAcessoDto } from './dto/update-acesso.dto';

@Controller('acessos')
export class AcessosController {
  constructor(private readonly acessosService: AcessosService) {}

  @Post()
  create(@Body() createAcessoDto: CreateAcessoDto) {
    return this.acessosService.create(createAcessoDto);
  }

  @Get()
  findAll() {
    return this.acessosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.acessosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAcessoDto: UpdateAcessoDto) {
    return this.acessosService.update(+id, updateAcessoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.acessosService.remove(+id);
  }
}
