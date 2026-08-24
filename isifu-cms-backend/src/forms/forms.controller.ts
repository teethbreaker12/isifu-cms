import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { FormsService } from './forms.service';
import { SubmitFormDto, UpsertFormDto } from './dto';

@Controller('forms')
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Get()
  findAll() {
    return this.forms.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.forms.findByKey(key);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Get(':key/submissions')
  submissions(@Param('key') key: string) {
    return this.forms.submissions(key);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Delete(':key/submissions/:id')
  removeSubmission(@Param('key') key: string, @Param('id', ParseIntPipe) id: number) {
    return this.forms.removeSubmission(key, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: UpsertFormDto) {
    return this.forms.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':key')
  update(@Param('key') key: string, @Body() dto: UpsertFormDto) {
    return this.forms.update(key, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':key')
  remove(@Param('key') key: string) {
    return this.forms.remove(key);
  }

  @Post(':key/submit')
  submit(@Param('key') key: string, @Body() dto: SubmitFormDto) {
    return this.forms.submit(key, dto);
  }
}
