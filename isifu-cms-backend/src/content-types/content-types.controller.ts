import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ContentTypesService } from './content-types.service';
import { CreateContentTypeDto, UpdateContentTypeDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('content-types')
export class ContentTypesController {
  constructor(private readonly contentTypes: ContentTypesService) {}

  @Get()
  findAll() {
    return this.contentTypes.findAll();
  }

  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.contentTypes.findByKey(key);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateContentTypeDto) {
    return this.contentTypes.create(dto);
  }

  @Roles(Role.ADMIN)
  @Put(':key')
  update(@Param('key') key: string, @Body() dto: UpdateContentTypeDto) {
    return this.contentTypes.update(key, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':key')
  remove(@Param('key') key: string) {
    return this.contentTypes.remove(key);
  }
}
