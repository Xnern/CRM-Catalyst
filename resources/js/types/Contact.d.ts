import type { UserMinimal } from './User';
import type { Company } from './Company';

export interface Contact {
  id: number;
  company_id?: number;
  user_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;

  user?: UserMinimal;
  company?: Pick<Company, 'id' | 'name'>;
}
