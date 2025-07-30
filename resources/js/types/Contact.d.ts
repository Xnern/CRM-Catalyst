export interface Contact {
    id: number;
    user_id: number;
    name: string;
    status: 'Nouveau' | 'Qualification' | 'Proposition envoyée' | 'Négociation' | 'Converti' | 'Perdu';
    email: string | null;
    phone: string | null;
    address: string | null;
    latitude?: number | null; // Optional: Latitude coordinate
    longitude?: number | null; // Optional: Longitude coordinate
    created_at: string;
    updated_at: string;
    user?: { // Optional: User relationship details
        id: number;
        name: string;
        email: string;
    };
}
