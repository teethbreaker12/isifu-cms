import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { TestSmtpSettingsDto, UpdateSmtpSettingsDto } from './dto';

export type SmtpConfig = {
  enabled: boolean;
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  fromName?: string;
  fromEmail?: string;
};

type StoredSmtpSettings = {
  enabled: boolean;
  host: string | null;
  port: number;
  secure: boolean;
  user: string | null;
  pass: string | null;
  fromName: string | null;
  fromEmail: string | null;
};

const SMTP_SETTINGS_ID = 1;

@Injectable()
export class SmtpSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getPublicSettings() {
    const settings = await this.prisma.smtpSettings.findUnique({ where: { id: SMTP_SETTINGS_ID } });
    const fallback = this.envConfig();
    const current = settings ? this.normalizeConfig(settings) : fallback;
    return {
      enabled: current.enabled,
      host: current.host || '',
      port: current.port,
      secure: current.secure,
      user: current.user || '',
      fromName: current.fromName || '',
      fromEmail: current.fromEmail || '',
      hasPassword: Boolean(current.pass),
      source: settings ? 'database' : 'env',
    };
  }

  async getConfig(): Promise<SmtpConfig> {
    const settings = await this.prisma.smtpSettings.findUnique({ where: { id: SMTP_SETTINGS_ID } });
    return settings ? this.normalizeConfig(settings) : this.envConfig();
  }

  async update(dto: UpdateSmtpSettingsDto) {
    const existing = await this.prisma.smtpSettings.findUnique({ where: { id: SMTP_SETTINGS_ID } });
    const data = this.normalizeDto(dto, existing?.pass || undefined);
    const saved = await this.prisma.smtpSettings.upsert({
      where: { id: SMTP_SETTINGS_ID },
      create: { id: SMTP_SETTINGS_ID, ...data },
      update: data,
    });
    return {
      enabled: saved.enabled,
      host: saved.host || '',
      port: saved.port,
      secure: saved.secure,
      user: saved.user || '',
      fromName: saved.fromName || '',
      fromEmail: saved.fromEmail || '',
      hasPassword: Boolean(saved.pass),
      source: 'database',
    };
  }

  async test(dto: TestSmtpSettingsDto) {
    const existing = await this.prisma.smtpSettings.findUnique({ where: { id: SMTP_SETTINGS_ID } });
    const config = this.normalizeDto(dto, existing?.pass || undefined);
    await this.verifyConnection(config);
    return { ok: true };
  }

  async sendMail(config: SmtpConfig, message: { to: string; subject: string; text: string; html: string }) {
    const transporter = this.createTransport(config);
    await transporter.sendMail({ from: this.fromAddress(config), ...message });
  }

  async verifyConnection(config: SmtpConfig) {
    const transporter = this.createTransport(config);
    await transporter.verify();
  }

  private createTransport(config: SmtpConfig) {
    if (!config.enabled) throw new BadRequestException('SMTP is disabled');
    if (!config.host) throw new BadRequestException('SMTP host is required');

    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  private normalizeDto(dto: UpdateSmtpSettingsDto, currentPassword?: string): SmtpConfig {
    return {
      enabled: dto.enabled,
      host: this.clean(dto.host),
      port: dto.port || 587,
      secure: dto.secure,
      user: this.clean(dto.user),
      pass: dto.pass ? dto.pass : currentPassword,
      fromName: this.clean(dto.fromName),
      fromEmail: this.clean(dto.fromEmail),
    };
  }

  private normalizeConfig(settings: StoredSmtpSettings): SmtpConfig {
    return {
      enabled: settings.enabled,
      host: settings.host || undefined,
      port: settings.port || 587,
      secure: settings.secure,
      user: settings.user || undefined,
      pass: settings.pass || undefined,
      fromName: settings.fromName || undefined,
      fromEmail: settings.fromEmail || undefined,
    };
  }

  private envConfig(): SmtpConfig {
    const user = this.config.get<string>('SMTP_USER') || undefined;
    const from = this.config.get<string>('SMTP_FROM') || '';
    const parsed = this.parseFrom(from);
    return {
      enabled: Boolean(this.config.get<string>('SMTP_HOST')),
      host: this.config.get<string>('SMTP_HOST') || undefined,
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
      user,
      pass: this.config.get<string>('SMTP_PASS') || undefined,
      fromName: parsed.fromName,
      fromEmail: parsed.fromEmail || user,
    };
  }

  private fromAddress(config: SmtpConfig) {
    const email = config.fromEmail || config.user || 'cms@example.com';
    return config.fromName ? `${config.fromName} <${email}>` : email;
  }

  private parseFrom(value: string) {
    const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    if (match) return { fromName: match[1], fromEmail: match[2] };
    return { fromName: undefined, fromEmail: value || undefined };
  }

  private clean(value?: string) {
    const next = value?.trim();
    return next || undefined;
  }
}
