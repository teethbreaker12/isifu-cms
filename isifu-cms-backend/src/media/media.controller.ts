import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateMediaFolderDto, UpdateMediaAssetFolderDto, UpdateMediaFolderDto, UploadMediaDto } from './dto';
import { MediaService } from './media.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.EDITOR)
  findAll() {
    return this.media.findAll();
  }

  @Get('folders')
  @Roles(Role.ADMIN, Role.EDITOR)
  findFolders() {
    return this.media.findFolders();
  }

  @Post('folders')
  @Roles(Role.ADMIN)
  createFolder(@Body() dto: CreateMediaFolderDto) {
    return this.media.createFolder(dto);
  }

  @Patch('folders/:id')
  @Roles(Role.ADMIN)
  updateMediaFolder(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMediaFolderDto) {
    return this.media.updateMediaFolder(id, dto);
  }

  @Delete('folders/:id')
  @Roles(Role.ADMIN)
  removeFolder(@Param('id', ParseIntPipe) id: number) {
    return this.media.removeFolder(id);
  }

  @Post('upload')
  @Roles(Role.ADMIN, Role.EDITOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR || './uploads',
        filename: (_req, file, callback) => {
          callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, callback) => {
        callback(null, /^image\/|application\/pdf$/.test(file.mimetype));
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadMediaDto) {
    return this.media.create(file, dto);
  }

  @Patch(':id/folder')
  @Roles(Role.ADMIN, Role.EDITOR)
  updateFolder(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMediaAssetFolderDto) {
    return this.media.updateFolder(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.media.remove(id);
  }
}
