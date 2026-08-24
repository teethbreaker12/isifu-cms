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

  async removeSubmission(key: string, id: number) {
    const form = await this.findByKey(key);
    const [submission] = await this.prisma.$queryRawUnsafe<FormSubmissionRow[]>(
      'SELECT * FROM `FormSubmission` WHERE `id` = ? AND `formId` = ? LIMIT 1',
      id,
      form.id,
    );
    if (!submission) throw new NotFoundException('Submission not found');
    await this.prisma.$executeRawUnsafe('DELETE FROM `FormSubmission` WHERE `id` = ?', id);
    return {
      ...submission,
      data: this.parseJson(submission.data),
      notificationSent: Boolean(submission.notificationSent),
      responseSent: Boolean(submission.responseSent),
    };
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
    const html = this.emailLayout({
      title: 'Nowe zgłoszenie formularza',
      eyebrow: 'ISIFU CMS',
      intro: `Otrzymano nowe zgłoszenie z formularza "${form.name}".`,
      meta: [
        ['Formularz', form.name],
        ['ID zgłoszenia', String(submissionId)],
        ['Data', new Date().toLocaleString('pl-PL')],
      ],
      body: this.submissionTable(form, data),
    });
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
      html: this.emailLayout({
        title: subject,
        eyebrow: 'ISIFU CMS',
        intro: `Potwierdzenie zgłoszenia z formularza "${form.name}".`,
        body: `<div style="font-size:15px;line-height:1.7;color:#44403c;">${this.escapeHtml(message).replace(/\n/g, '<br>')}</div>`,
      }),
    });
  }

  private submissionTable(form: FormWithFields, data: Record<string, unknown>) {
    const rows = form.fields
      .map((field) => {
        const value = this.escapeHtml(this.formatValue(data[field.key])) || '<span style="color:#a8a29e;">Brak danych</span>';
        return [
          '<tr>',
          '<th style="width:34%;padding:12px 14px;border-bottom:1px solid #e7e5e4;text-align:left;vertical-align:top;font-size:12px;line-height:1.4;font-weight:700;text-transform:uppercase;color:#78716c;background:#fafaf9;">',
          this.escapeHtml(field.label),
          '</th>',
          '<td style="padding:12px 14px;border-bottom:1px solid #e7e5e4;vertical-align:top;font-size:14px;line-height:1.6;color:#292524;">',
          value.replace(/\n/g, '<br>'),
          '</td>',
          '</tr>',
        ].join('');
      })
      .join('');

    return [
      '<table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e7e5e4;border-radius:8px;overflow:hidden;background:#ffffff;">',
      rows,
      '</table>',
    ].join('');
  }

  private emailLayout(options: {
    title: string;
    eyebrow: string;
    intro?: string;
    meta?: Array<[string, string]>;
    body: string;
  }) {
    const meta = options.meta?.length
      ? [
          '<table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin:0 0 18px;border-collapse:collapse;">',
          ...options.meta.map(([label, value]) => [
            '<tr>',
            '<td style="padding:5px 0;width:140px;font-size:12px;line-height:1.4;text-transform:uppercase;font-weight:700;color:#78716c;">',
            this.escapeHtml(label),
            '</td>',
            '<td style="padding:5px 0;font-size:14px;line-height:1.5;color:#292524;">',
            this.escapeHtml(value),
            '</td>',
            '</tr>',
          ].join('')),
          '</table>',
        ].join('')
      : '';

    return [
      '<!doctype html>',
      '<html>',
      '<body style="margin:0;padding:0;background:#f5f5f4;font-family:Inter,Arial,sans-serif;color:#292524;">',
      '<div style="display:none;max-height:0;overflow:hidden;color:transparent;">',
      this.escapeHtml(options.title),
      '</div>',
      '<table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;border-collapse:collapse;background:#f5f5f4;">',
      '<tr>',
      '<td align="center" style="padding:32px 16px;">',
      '<table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:680px;border-collapse:collapse;">',
      '<tr>',
      '<td style="padding:0 0 12px;font-size:12px;line-height:1.4;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#57534e;">',
      this.escapeHtml(options.eyebrow),
      '</td>',
      '</tr>',
      '<tr>',
      '<td style="border:1px solid #e7e5e4;border-radius:8px;background:#ffffff;box-shadow:0 12px 30px rgba(41,37,36,.08);overflow:hidden;">',
      '<div style="height:4px;background:#2563eb;"></div>',
      '<div style="padding:26px 26px 8px;">',
      '<h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;font-weight:800;color:#1c1917;">',
      this.escapeHtml(options.title),
      '</h1>',
      options.intro ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#57534e;">${this.escapeHtml(options.intro)}</p>` : '',
      meta,
      '</div>',
      '<div style="padding:0 26px 26px;">',
      options.body,
      '</div>',
      '</td>',
      '</tr>',
      '<tr>',
      '<td style="padding:14px 2px 0;font-size:12px;line-height:1.6;color:#78716c;">',
      'Wysłano z wykorzystaniem panelu administracyjnego ISIFU CMS. ',
      '<a href="https://isifu.dev" style="color:#2563eb;text-decoration:none;font-weight:700;">isifu.dev</a>',
      '</td>',
      '</tr>',
      '</table>',
      '</td>',
      '</tr>',
      '</table>',
      '</body>',
      '</html>',
    ].join('');
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
