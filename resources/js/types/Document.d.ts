export type Document = {
  id: number;
  uuid: string;
  name: string;
  original_filename: string;
  mime_type: string;
  extension?: string | null;
  size_bytes: number;
  storage_disk: string;
  storage_path: string;
  visibility: 'private' | 'team' | 'company';
  description?: string | null;
  tags?: string[];
  owner?: { id: number; name: string } | null;
  companies?: { id: number; name: string; role?: string | null }[];
  contacts?: { id: number; name: string; role?: string | null }[];
  created_at?: string;
  updated_at?: string;
};