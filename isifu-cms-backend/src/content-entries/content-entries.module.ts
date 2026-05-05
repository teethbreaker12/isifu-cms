import { Module } from '@nestjs/common';
import { ContentEntriesController } from './content-entries.controller';
import { ContentEntriesService } from './content-entries.service';

@Module({
  controllers: [ContentEntriesController],
  providers: [ContentEntriesService],
  exports: [ContentEntriesService],
})
export class ContentEntriesModule {}
