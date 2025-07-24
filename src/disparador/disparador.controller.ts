import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DisparadorService } from './disparador.service';
import { CreateDisparadorDto } from './dto/create-disparador.dto';
import { UpdateDisparadorDto } from './dto/update-disparador.dto';

@Controller('disparador')
export class DisparadorController {
  constructor(private readonly disparadorService: DisparadorService) {}

  @Post()
  create(@Body() createDisparadorDto: CreateDisparadorDto) {
    return this.disparadorService.create(createDisparadorDto);
  }

  @Get()
  findAll() {
    return this.disparadorService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.disparadorService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDisparadorDto: UpdateDisparadorDto) {
    return this.disparadorService.update(+id, updateDisparadorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.disparadorService.remove(+id);
  }
}
