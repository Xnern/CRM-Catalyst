import type { UserMinimal } from './User';
import type { Company } from './Company';
import type { Contact } from './Contact';

export type Document = {
  id: number;
  uuid: string;
  name: string;
  original_filename: string;
  mime_type: string;
  extension?: string | null;
  size_bytes: number;
  size_human?: string;
  storage_disk: string;
  storage_path: string;
  visibility: 'private' | 'team' | 'company';
  description?: string | null;
  tags?: string[];
  owner?: UserMinimal | null;

  companies?: (Pick<Company, 'id' | 'name'> & { role?: string | null })[];
  contacts?: (Pick<Contact, 'id' | 'name'> & { role?: string | null })[];

  created_at?: string;
  updated_at?: string;
};
