import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [MulterModule.register({})],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
