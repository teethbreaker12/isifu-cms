import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpSettingsService } from '../settings/smtp-settings.service';
import { FormFieldDto, SubmitFormDto, UpsertFormDto } from './dto';

type FormRow = {
  id: number;
  name: string;
  key: string;
  description: string | null;
  recipientEmail: string;
  notificationSubject: string | null;
  responderEnabled: boolean | number;
  responderEmailField: string | null;
  responderSubject: string | null;
  responderMessage: string | null;
  successMessage: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type FormFieldRow = {
  id: number;
  formId: number;
  label: string;
  key: string;
  type: string;
  required: boolean | number;
  settings: unknown;
  order: number;
};

type FormSubmissionRow = {
  id: number;
  formId: number;
  data: unknown;
  respondentEmail: string | null;
  notificationSent: boolean | number;
  responseSent: boolean | number;
  createdAt: Date | string;
};

type FormWithFields = ReturnType<FormsService['normalizeForm']>;

@Injectable()
export class FormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smtp: SmtpSettingsService,
  ) {}

  async findAll() {
    const forms = await this.prisma.$queryRawUnsafe<FormRow[]>('SELECT * FROM `Form` ORDER BY `createdAt` DESC');
    return Promise.all(forms.map((form) => this.withFields(form)));
  }

  async findByKey(key: string) {
    const [form] = await this.prisma.$queryRawUnsafe<FormRow[]>('SELECT * FROM `Form` WHERE `key` = ? LIMIT 1', key);
    if (!form) throw new NotFoundException('Form not found');
    return this.withFields(form);
  }

  async submissions(key: string) {
    const form = await this.findByKey(key);
    const rows = await this.prisma.$queryRawUnsafe<FormSubmissionRow[]>(
      'SELECT * FROM `FormSubmission` WHERE `formId` = ? ORDER BY `createdAt` DESC LIMIT 100',
      form.id,
    );
    return rows.map((row) => ({
      ...row,
      data: this.parseJson(row.data),
      notificationSent: Boolean(row.notificationSent),
      responseSent: Boolean(row.responseSent),
    }));
  }

  async create(dto: UpsertFormDto) {
    this.validateForm(dto);
    return this.prisma.$transaction(async (tx) => {
      const data = this.formData(dto);
      await tx.$executeRawUnsafe(
        'INSERT INTO `Form` (`name`, `key`, `description`, `recipientEmail`, `notificationSubject`, `responderEnabled`, `responderEmailField`, `responderSubject`, `responderMessage`, `successMessage`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))',
        data.name,
        data.key,
        data.description,
        data.recipientEmail,
        data.notificationSubject,
        data.responderEnabled,
        data.responderEmailField,
        data.responderSubject,
        data.responderMessage,
        data.successMessage,
      );
      const [{ id }] = await tx.$queryRawUnsafe<{ id: number }[]>('SELECT LAST_INSERT_ID() AS id');
      await this.insertFields(tx, id, dto.fields);
      const [form] = await tx.$queryRawUnsafe<FormRow[]>('SELECT * FROM `Form` WHERE `id` = ? LIMIT 1', id);
      const fields = await tx.$queryRawUnsafe<FormFieldRow[]>('SELECT * FROM `FormField` WHERE `formId` = ? ORDER BY `order` ASC', id);
      return this.normalizeForm(form, fields);
    });
  }

  async update(key: string, dto: UpsertFormDto) {
    this.validateForm(dto);
    const existing = await this.findByKey(key);
    return this.prisma.$transaction(async (tx) => {
      const data = this.formData(dto);
      await tx.$executeRawUnsafe(
        'UPDATE `Form` SET `name` = ?, `key` = ?, `description` = ?, `recipientEmail` = ?, `notificationSubject` = ?, `responderEnabled` = ?, `responderEmailField` = ?, `responderSubject` = ?, `responderMessage` = ?, `successMessage` = ?, `updatedAt` = NOW(3) WHERE `id` = ?',
        data.name,
        data.key,
        data.description,
        data.recipientEmail,
        data.notificationSubject,
        data.responderEnabled,
        data.responderEmailField,
        data.responderSubject,
        data.responderMessage,
        data.successMessage,
        existing.id,
      );
      await tx.$executeRawUnsafe('DELETE FROM `FormField` WHERE `formId` = ?', existing.id);
      await this.insertFields(tx, existing.id, dto.fields);
      const [form] = await tx.$queryRawUnsafe<FormRow[]>('SELECT * FROM `Form` WHERE `id` = ? LIMIT 1', existing.id);
      const fields = await tx.$queryRawUnsafe<FormFieldRow[]>('SELECT * FROM `FormField` WHERE `formId` = ? ORDER BY `order` ASC', existing.id);
      return this.normalizeForm(form, fields);
    });
  }

  async remove(key: string) {
    const form = await this.findByKey(key);
    await this.prisma.$executeRawUnsafe('DELETE FROM `Form` WHERE `id` = ?', form.id);
    return form;
  }

  async submit(key: string, dto: SubmitFormDto) {
    const form = await this.findByKey(key);
    const data = this.normalizeSubmission(form.fields, dto.data);
    const respondentEmail = this.respondentEmail(form, data);
    const submission = await this.createSubmission(form.id, data, respondentEmail);

    const notificationSent = await this.sendNotification(form, data, submission.id);
    let responseSent = false;
    if (notificationSent && form.responderEnabled && respondentEmail) {
      responseSent = await this.sendResponse(form, data, respondentEmail);
    }

    await this.prisma.$executeRawUnsafe(
      'UPDATE `FormSubmission` SET `notificationSent` = ?, `responseSent` = ? WHERE `id` = ?',
      notificationSent,
      responseSent,
      submission.id,
    );

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

  private async withFields(form: FormRow) {
    const fields = await this.prisma.$queryRawUnsafe<FormFieldRow[]>(
      'SELECT * FROM `FormField` WHERE `formId` = ? ORDER BY `order` ASC',
      form.id,
    );
    return this.normalizeForm(form, fields);
  }

  private normalizeForm(form: FormRow, fields: FormFieldRow[]) {
    return {
      ...form,
      responderEnabled: Boolean(form.responderEnabled),
      fields: fields.map((field) => ({
        ...field,
        required: Boolean(field.required),
        settings: this.parseJson(field.settings),
      })),
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

  private async insertFields(tx: Pick<PrismaService, '$executeRawUnsafe'>, formId: number, fields: FormFieldDto[]) {
    for (const [index, field] of fields.entries()) {
      await tx.$executeRawUnsafe(
        'INSERT INTO `FormField` (`formId`, `label`, `key`, `type`, `required`, `settings`, `order`) VALUES (?, ?, ?, ?, ?, ?, ?)',
        formId,
        field.label,
        field.key,
        field.type,
        field.required ?? false,
        field.settings ? JSON.stringify(field.settings) : null,
        field.order ?? index,
      );
    }
  }

  private async createSubmission(formId: number, data: Record<string, unknown>, respondentEmail?: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        'INSERT INTO `FormSubmission` (`formId`, `data`, `respondentEmail`, `createdAt`) VALUES (?, ?, ?, NOW(3))',
        formId,
        JSON.stringify(data),
        respondentEmail ?? null,
      );
      const [submission] = await tx.$queryRawUnsafe<FormSubmissionRow[]>('SELECT * FROM `FormSubmission` WHERE `id` = LAST_INSERT_ID()');
      return {
        ...submission,
        data: this.parseJson(submission.data),
        notificationSent: Boolean(submission.notificationSent),
        responseSent: Boolean(submission.responseSent),
      };
    });
  }

  private parseJson(value: unknown) {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
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
    try {
      await this.smtp.sendMail(await this.smtp.getConfig(), message);
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
