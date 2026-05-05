import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { UpsertPageDto } from './dto';
import { PagesService } from './pages.service';

@Controller('pages')
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  findAll(@Query('published') published?: string) {
    return this.pages.findAll(published === 'true');
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string, @Query('published') published?: string) {
    return this.pages.findOne(slug, published === 'true');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: UpsertPageDto) {
    return this.pages.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Put(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpsertPageDto, @CurrentUser() user: JwtUser) {
    return this.pages.update(slug, dto, user.role as Role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.pages.remove(slug);
  }
}
