/**
 * CRM Settings Configuration Types
 * Comprehensive type definitions for all CRM system settings
 */

// Individual setting categories
export interface GeneralSettings {
    company_name: string;
    company_address: string;
    company_phone: string;
    company_email: string;
    default_currency: string;
    timezone: string;
    language: string;
  }

  export interface EmailSettings {
    smtp_host: string;
    smtp_port: string;
    smtp_username: string;
    smtp_password: string;
    email_from_name: string;
    email_from_address: string;
  }

  export interface SalesSettings {
    default_pipeline: string;
    lead_sources: string[];
    opportunity_stages: string[];
  }

  export interface SystemSettings {
    data_retention_days: string;
    max_file_size_mb: string;
    allowed_file_types: string[];
  }

  export interface BrandingSettings {
    company_logo_url: string;
    primary_color: string;
    secondary_color: string;
  }

  // Main CRM Settings interface
  export interface CrmSettings {
    general: GeneralSettings;
    email: EmailSettings;
    sales: SalesSettings;
    system: SystemSettings;
    branding: BrandingSettings;
  }

  // Individual setting record (database model)
  export interface CrmSettingRecord {
    id: number;
    key: string;
    value: any; // JSON value
    category: 'general' | 'email' | 'sales' | 'system' | 'branding';
    description?: string;
    is_public: boolean;
    created_at: string;
    updated_at: string;
  }

  // API Response types
  export interface CrmSettingsResponse {
    success: boolean;
    data: CrmSettings;
    message?: string;
  }

  export interface CrmSettingsUpdateResponse {
    success: boolean;
    message: string;
    data: CrmSettings;
  }

  export interface CrmSettingUpdatePayload {
    key: string;
    value: any;
    category?: 'general' | 'email' | 'sales' | 'system' | 'branding';
  }

  export interface PublicCrmSettingsResponse {
    success: boolean;
    data: Record<string, any>;
  }

  // Utility types for specific operations
  export type CrmSettingCategory = keyof CrmSettings;
  export type CrmSettingKey<T extends CrmSettingCategory> = keyof CrmSettings[T];

  // Form validation schemas (optional - for frontend validation)
  export interface CrmSettingsValidation {
    general: {
      company_name: { required: boolean; maxLength: number };
      company_email: { required: boolean; pattern: RegExp };
      company_phone: { required: boolean; maxLength: number };
      default_currency: { required: boolean; options: string[] };
      timezone: { required: boolean; options: string[] };
      language: { required: boolean; options: string[] };
    };
    email: {
      smtp_host: { required: boolean; maxLength: number };
      smtp_port: { required: boolean; min: number; max: number };
      smtp_username: { required: boolean; maxLength: number };
      email_from_address: { required: boolean; pattern: RegExp };
    };
    system: {
      data_retention_days: { required: boolean; min: number; max: number };
      max_file_size_mb: { required: boolean; min: number; max: number };
      allowed_file_types: { required: boolean; minItems: number };
    };
  }

  // Constants for dropdown options
  export const CURRENCY_OPTIONS = [
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' },
    { value: 'CAD', label: 'Canadian Dollar (C$)' },
    { value: 'JPY', label: 'Japanese Yen (¥)' }
  ] as const;

  export const TIMEZONE_OPTIONS = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Asia/Tokyo', label: 'Tokyo' }
  ] as const;

  export const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'French' },
    { value: 'es', label: 'Spanish' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' }
  ] as const;

  export const DEFAULT_LEAD_SOURCES = [
    'Website',
    'Referral',
    'Cold Call',
    'Trade Show',
    'Social Media'
  ] as const;

  export const DEFAULT_OPPORTUNITY_STAGES = [
    'Prospecting',
    'Qualification',
    'Proposal',
    'Negotiation',
    'Closed Won',
    'Closed Lost'
  ] as const;

  export const DEFAULT_FILE_TYPES = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'png',
    'jpg',
    'jpeg'
  ] as const;
