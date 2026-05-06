export type Role = 'ADMIN' | 'EDITOR';
export type FieldType = 'text' | 'textarea' | 'richtext' | 'image' | 'lucideIcon' | 'boolean' | 'date' | 'repeater';

export type User = {
  id: number;
  email: string;
  name?: string;
  role: Role;
  twoFactorEnabled?: boolean;
};

export type ContentField = {
  id?: number;
  label: string;
  key: string;
  type: FieldType;
  required?: boolean;
  settings?: Record<string, unknown>;
  order?: number;
};

export type ContentType = {
  id: number;
  name: string;
  key: string;
  description?: string;
  fields: ContentField[];
};

export type ContentEntry = {
  id: number;
  slug?: string;
  status: 'draft' | 'published';
  data: Record<string, unknown>;
  updatedAt: string;
};

export type Page = {
  id: number;
  slug: string;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  contentTypeId?: number;
  entryId?: number;
  blocks?: PageBlock[];
  published: boolean;
};

export type PageBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

export type MediaAsset = {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  storage: string;
  createdAt: string;
};

export type FormFieldType = 'text' | 'email' | 'phone' | 'date' | 'textarea' | 'select' | 'checkbox' | 'hidden';

export type FormField = {
  id?: number;
  label: string;
  key: string;
  type: FormFieldType;
  required?: boolean;
  settings?: Record<string, unknown>;
  order?: number;
};

export type ContactForm = {
  id: number;
  name: string;
  key: string;
  description?: string;
  recipientEmail: string;
  notificationSubject?: string;
  responderEnabled?: boolean;
  responderEmailField?: string;
  responderSubject?: string;
  responderMessage?: string;
  successMessage?: string;
  fields: FormField[];
};

export type FormSubmission = {
  id: number;
  formId: number;
  data: Record<string, unknown>;
  respondentEmail?: string;
  notificationSent: boolean;
  responseSent: boolean;
  createdAt: string;
};
