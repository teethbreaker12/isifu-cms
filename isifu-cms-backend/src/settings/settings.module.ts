import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SmtpSettingsService } from './smtp-settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SmtpSettingsService],
  exports: [SmtpSettingsService],
})
export class SettingsModule {}
