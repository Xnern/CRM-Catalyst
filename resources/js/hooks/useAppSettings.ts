import { usePage } from '@inertiajs/react';

interface AppSettings {
    upload: {
        allowed_extensions: string[];
        max_file_size: number;
        storage_path: string;
    };
    identity: {
        company_name: string;
        company_logo: string | null;
        company_email: string;
        company_phone: string;
        company_address: string;
        company_city: string;
        company_postal_code: string;
        company_country: string;
    };
    security: {
        session_lifetime: number;
        password_min_length: number;
        password_require_uppercase: boolean;
        password_require_lowercase: boolean;
        password_require_numbers: boolean;
        password_require_special_chars: boolean;
        two_factor_enabled: boolean;
    };
    branding: {
        primary_color: string;
        secondary_color: string;
    };
}

export function useAppSettings(): AppSettings | null {
    const { appSettings } = usePage().props as { appSettings?: AppSettings };
    return appSettings || null;
}