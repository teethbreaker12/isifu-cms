import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { TestSmtpSettingsDto, UpdateSmtpSettingsDto } from './dto';
import { SmtpSettingsService } from './smtp-settings.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('settings')
export class SettingsController {
  constructor(private readonly smtp: SmtpSettingsService) {}

  @Get('smtp')
  smtpSettings() {
    return this.smtp.getPublicSettings();
  }

  @Put('smtp')
  updateSmtp(@Body() dto: UpdateSmtpSettingsDto) {
    return this.smtp.update(dto);
  }

  @Post('smtp/test')
  testSmtp(@Body() dto: TestSmtpSettingsDto) {
    return this.smtp.test(dto);
  }
}
