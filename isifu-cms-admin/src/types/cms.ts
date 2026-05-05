export type Role = 'ADMIN' | 'EDITOR';
export type FieldType = 'text' | 'textarea' | 'richtext' | 'image' | 'lucideIcon' | 'boolean' | 'repeater';

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
  type: 'hero' | 'text' | 'textarea' | 'richtext' | 'image' | 'lucideIcon' | 'boolean' | 'repeater' | 'cta' | 'entry';
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
