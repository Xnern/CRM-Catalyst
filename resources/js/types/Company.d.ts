export type Company = {
    id: number;
    name: string;
    domain: string | null;
    industry: string | null;
    size: string | null;
    status: 'Prospect' | 'Client' | 'Inactif';
    owner_id: number | null;
    address: string | null;
    city: string | null;
    zipcode: string | null;
    country: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    contacts_count?: number;
  };
  