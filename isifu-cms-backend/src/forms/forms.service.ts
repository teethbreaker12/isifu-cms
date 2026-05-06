import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { FormFieldDto, SubmitFormDto, UpsertFormDto } from './dto';

type FormWithFields = Prisma.FormGetPayload<{ include: { fields: true } }>;

@Injectable()
export class FormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  findAll() {
    return this.prisma.form.findMany({
      include: { fields: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByKey(key: string) {
    const form = await this.prisma.form.findUnique({
      where: { key },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async submissions(key: string) {
    const form = await this.findByKey(key);
    return this.prisma.formSubmission.findMany({
      where: { formId: form.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async create(dto: UpsertFormDto) {
    this.validateForm(dto);
    return this.prisma.form.create({
      data: {
        ...this.formData(dto),
        fields: { create: this.fieldCreateInput(dto.fields) },
      },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
  }

  async update(key: string, dto: UpsertFormDto) {
    this.validateForm(dto);
    const existing = await this.findByKey(key);
    return this.prisma.$transaction(async (tx) => {
      await tx.formField.deleteMany({ where: { formId: existing.id } });
      return tx.form.update({
        where: { id: existing.id },
        data: {
          ...this.formData(dto),
          fields: { create: this.fieldCreateInput(dto.fields) },
        },
        include: { fields: { orderBy: { order: 'asc' } } },
      });
    });
  }

  async remove(key: string) {
    const form = await this.findByKey(key);
    return this.prisma.form.delete({ where: { id: form.id } });
  }

  async submit(key: string, dto: SubmitFormDto) {
    const form = await this.findByKey(key);
    const data = this.normalizeSubmission(form.fields, dto.data);
    const respondentEmail = this.respondentEmail(form, data);
    const submission = await this.prisma.formSubmission.create({
      data: {
        formId: form.id,
        data: data as Prisma.InputJsonObject,
        respondentEmail,
      },
    });

    const notificationSent = await this.sendNotification(form, data, submission.id);
    let responseSent = false;
    if (notificationSent && form.responderEnabled && respondentEmail) {
      responseSent = await this.sendResponse(form, data, respondentEmail);
    }

    await this.prisma.formSubmission.update({
      where: { id: submission.id },
      data: { notificationSent, responseSent },
    });

    if (!notificationSent) {
      throw new BadRequestException('Form submission was saved, but notification email could not be sent');
    }

    return {
      ok: true,
      submissionId: submission.id,
      notificationSent,
      responseSent,
      message: form.successMessage || 'Form submitted',
    };
  }

  private formData(dto: UpsertFormDto) {
    return {
      name: dto.name,
      key: dto.key,
      description: dto.description,
      recipientEmail: dto.recipientEmail,
      notificationSubject: dto.notificationSubject,
      responderEnabled: dto.responderEnabled ?? false,
      responderEmailField: dto.responderEnabled ? dto.responderEmailField : null,
      responderSubject: dto.responderSubject,
      responderMessage: dto.responderMessage,
      successMessage: dto.successMessage,
    };
  }

  private validateForm(dto: UpsertFormDto) {
    this.assertUniqueFields(dto.fields);
    if (dto.responderEnabled && dto.responderEmailField) {
      const field = dto.fields.find((item) => item.key === dto.responderEmailField);
      if (!field) throw new BadRequestException('Responder email field does not exist');
      if (field.type !== 'email') throw new BadRequestException('Responder email field must be an email field');
    }
  }

  private assertUniqueFields(fields: FormFieldDto[]) {
    const keys = new Set<string>();
    for (const field of fields) {
      if (keys.has(field.key)) throw new BadRequestException(`Duplicate field key: ${field.key}`);
      keys.add(field.key);
    }
  }

  private fieldCreateInput(fields: FormFieldDto[]) {
    return fields.map((field, index) => ({
      label: field.label,
      key: field.key,
      type: field.type,
      required: field.required ?? false,
      settings: field.settings as Prisma.InputJsonObject | undefined,
      order: field.order ?? index,
    }));
  }

  private normalizeSubmission(fields: FormWithFields['fields'], input: Record<string, unknown>) {
    const output: Record<string, unknown> = {};
    for (const field of fields) {
      const value = this.normalizeValue(field.type, input[field.key]);
      if (field.required && this.isEmpty(value, field.type)) {
        throw new BadRequestException(`${field.key} is required`);
      }
      if (field.type === 'email' && typeof value === 'string' && value && !this.isEmail(value)) {
        throw new BadRequestException(`${field.key} must be a valid email`);
      }
      if (field.type === 'date' && typeof value === 'string' && value && !this.isDate(value)) {
        throw new BadRequestException(`${field.key} must be a valid date`);
      }
      output[field.key] = value;
    }
    return output;
  }

  private normalizeValue(type: string, value: unknown) {
    if (type === 'checkbox') return Boolean(value);
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return value;
  }

  private isEmpty(value: unknown, type: string) {
    if (type === 'checkbox') return value !== true;
    return value === null || value === undefined || value === '';
  }

  private respondentEmail(form: FormWithFields, data: Record<string, unknown>) {
    if (!form.responderEnabled || !form.responderEmailField) return undefined;
    const value = data[form.responderEmailField];
    return typeof value === 'string' && this.isEmail(value) ? value : undefined;
  }

  private async sendNotification(form: FormWithFields, data: Record<string, unknown>, submissionId: number) {
    const subject = this.renderTemplate(form.notificationSubject || `Nowe zgłoszenie formularza: ${form.name}`, data);
    const rows = form.fields.map((field) => `${field.label}: ${this.formatValue(data[field.key])}`);
    const text = [`Formularz: ${form.name}`, `ID zgłoszenia: ${submissionId}`, '', ...rows].join('\n');
    const html = [
      `<p><strong>Formularz:</strong> ${this.escapeHtml(form.name)}</p>`,
      `<p><strong>ID zgłoszenia:</strong> ${submissionId}</p>`,
      '<table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse">',
      ...form.fields.map((field) => `<tr><th align="left">${this.escapeHtml(field.label)}</th><td>${this.escapeHtml(this.formatValue(data[field.key]))}</td></tr>`),
      '</table>',
    ].join('');
    return this.sendMail({
      to: form.recipientEmail,
      subject,
      text,
      html,
    });
  }

  private async sendResponse(form: FormWithFields, data: Record<string, unknown>, to: string) {
    const subject = this.renderTemplate(form.responderSubject || `Dziękujemy za kontakt: ${form.name}`, data);
    const message = this.renderTemplate(form.responderMessage || 'Dziękujemy za przesłanie formularza. Wiadomość została dostarczona.', data);
    return this.sendMail({
      to,
      subject,
      text: message,
      html: this.escapeHtml(message).replace(/\n/g, '<br>'),
    });
  }

  private async sendMail(message: { to: string; subject: string; text: string; html: string }) {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) return false;
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const secure = this.config.get<string>('SMTP_SECURE', 'false') === 'true';
    const from = this.config.get<string>('SMTP_FROM') || user || 'cms@example.com';
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
    try {
      await transporter.sendMail({ from, ...message });
      return true;
    } catch {
      return false;
    }
  }

  private renderTemplate(template: string, data: Record<string, unknown>) {
    return template.replace(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g, (_match, key: string) => this.formatValue(data[key]));
  }

  private formatValue(value: unknown): string {
    if (Array.isArray(value)) return value.map((item) => this.formatValue(item)).join(', ');
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'Tak' : 'Nie';
    return String(value ?? '');
  }

  private isEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
