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

export interface PaginatedApiResponse<T> {
    data: T[];
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
    meta: {
        current_page: number;
        from: number;
        last_page: number;
        links: {
            url: string | null;
            label: string;
            active: boolean;
        }[];
        path: string;
        per_page: number;
        to: number;
        total: number;
    };
}
