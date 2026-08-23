import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';

@Module({
  imports: [SettingsModule],
  controllers: [FormsController],
  providers: [FormsService],
})
export class FormsModule {}
