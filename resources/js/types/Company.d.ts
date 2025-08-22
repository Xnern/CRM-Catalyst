import type { UserMinimal } from './User';

export type Company = {
  id: number;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  status: 'Prospect' | 'Client' | 'Inactif';
  owner?: UserMinimal | null;
  address: string | null;
  city: string | null;
  zipcode: string | null;
  country: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  contacts_count?: number;
};

export interface CompanyStatusOption {
  value: string;
  label: string;
}

export interface CompanyStatusOptionsResponse {
  data: CompanyStatusOption[];
}
