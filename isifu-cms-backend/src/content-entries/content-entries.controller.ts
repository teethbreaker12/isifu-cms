import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { ContentEntriesService } from './content-entries.service';
import { UpsertEntryDto } from './dto';

@Controller('content/:type')
export class ContentEntriesController {
  constructor(private readonly entries: ContentEntriesService) {}

  @Get()
  findAll(@Param('type') type: string, @Query('published') published?: string) {
    return this.entries.findAll(type, published === 'true');
  }

  @Get(':idOrSlug')
  findOne(@Param('type') type: string, @Param('idOrSlug') idOrSlug: string, @Query('published') published?: string) {
    return this.entries.findOne(type, idOrSlug, published === 'true');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  create(@Param('type') type: string, @Body() dto: UpsertEntryDto) {
    return this.entries.create(type, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('type') type: string, @Param('id', ParseIntPipe) id: number, @Body() dto: UpsertEntryDto) {
    return this.entries.update(type, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('type') type: string, @Param('id', ParseIntPipe) id: number) {
    return this.entries.remove(type, id);
  }
}
