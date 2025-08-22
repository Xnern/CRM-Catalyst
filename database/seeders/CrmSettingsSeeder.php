<?php

namespace Database\Seeders;

use App\Models\CrmSetting;
use Illuminate\Database\Seeder;

class CrmSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // Upload settings
            [
                'key' => 'upload_allowed_extensions',
                'value' => ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'csv', 'zip'],
                'category' => 'upload',
                'description' => 'Extensions de fichiers autorisées pour les uploads',
                'is_public' => false,
            ],
            [
                'key' => 'upload_max_file_size',
                'value' => 10, // MB
                'category' => 'upload',
                'description' => 'Taille maximale des fichiers en MB',
                'is_public' => true,
            ],
            [
                'key' => 'upload_storage_path',
                'value' => 'documents',
                'category' => 'upload',
                'description' => 'Chemin de stockage des documents',
                'is_public' => false,
            ],

            // Identity settings
            [
                'key' => 'company_name',
                'value' => config('app.name', 'CRM Catalyst'),
                'category' => 'identity',
                'description' => 'Nom de l\'entreprise',
                'is_public' => true,
            ],
            [
                'key' => 'company_logo',
                'value' => '',
                'category' => 'identity',
                'description' => 'URL du logo de l\'entreprise',
                'is_public' => true,
            ],
            [
                'key' => 'company_email',
                'value' => 'contact@example.com',
                'category' => 'identity',
                'description' => 'Email principal de l\'entreprise',
                'is_public' => true,
            ],
            [
                'key' => 'company_phone',
                'value' => '+33 1 23 45 67 89',
                'category' => 'identity',
                'description' => 'Téléphone principal de l\'entreprise',
                'is_public' => true,
            ],
            [
                'key' => 'company_address',
                'value' => '123 Rue de la Paix',
                'category' => 'identity',
                'description' => 'Adresse de l\'entreprise',
                'is_public' => true,
            ],
            [
                'key' => 'company_city',
                'value' => 'Paris',
                'category' => 'identity',
                'description' => 'Ville de l\'entreprise',
                'is_public' => true,
            ],
            [
                'key' => 'company_postal_code',
                'value' => '75001',
                'category' => 'identity',
                'description' => 'Code postal de l\'entreprise',
                'is_public' => true,
            ],
            [
                'key' => 'company_country',
                'value' => 'France',
                'category' => 'identity',
                'description' => 'Pays de l\'entreprise',
                'is_public' => true,
            ],

            // Email settings
            [
                'key' => 'smtp_host',
                'value' => config('mail.mailers.smtp.host', 'smtp.gmail.com'),
                'category' => 'email',
                'description' => 'Serveur SMTP',
                'is_public' => false,
            ],
            [
                'key' => 'smtp_port',
                'value' => config('mail.mailers.smtp.port', 587),
                'category' => 'email',
                'description' => 'Port SMTP',
                'is_public' => false,
            ],
            [
                'key' => 'smtp_username',
                'value' => config('mail.mailers.smtp.username', ''),
                'category' => 'email',
                'description' => 'Nom d\'utilisateur SMTP',
                'is_public' => false,
            ],
            [
                'key' => 'smtp_password',
                'value' => config('mail.mailers.smtp.password', ''),
                'category' => 'email',
                'description' => 'Mot de passe SMTP',
                'is_public' => false,
            ],
            [
                'key' => 'smtp_encryption',
                'value' => config('mail.mailers.smtp.encryption', 'tls'),
                'category' => 'email',
                'description' => 'Chiffrement SMTP',
                'is_public' => false,
            ],
            [
                'key' => 'mail_from_address',
                'value' => config('mail.from.address', 'noreply@example.com'),
                'category' => 'email',
                'description' => 'Adresse email d\'envoi',
                'is_public' => false,
            ],
            [
                'key' => 'mail_from_name',
                'value' => config('mail.from.name', 'CRM Catalyst'),
                'category' => 'email',
                'description' => 'Nom de l\'expéditeur',
                'is_public' => false,
            ],

            // Security settings
            [
                'key' => 'session_lifetime',
                'value' => 120, // minutes
                'category' => 'security',
                'description' => 'Durée de vie de la session en minutes',
                'is_public' => false,
            ],
            [
                'key' => 'password_min_length',
                'value' => 8,
                'category' => 'security',
                'description' => 'Longueur minimale du mot de passe',
                'is_public' => true,
            ],
            [
                'key' => 'password_require_uppercase',
                'value' => true,
                'category' => 'security',
                'description' => 'Exiger au moins une majuscule dans le mot de passe',
                'is_public' => true,
            ],
            [
                'key' => 'password_require_lowercase',
                'value' => true,
                'category' => 'security',
                'description' => 'Exiger au moins une minuscule dans le mot de passe',
                'is_public' => true,
            ],
            [
                'key' => 'password_require_numbers',
                'value' => true,
                'category' => 'security',
                'description' => 'Exiger au moins un chiffre dans le mot de passe',
                'is_public' => true,
            ],
            [
                'key' => 'password_require_special_chars',
                'value' => false,
                'category' => 'security',
                'description' => 'Exiger au moins un caractère spécial dans le mot de passe',
                'is_public' => true,
            ],
            [
                'key' => 'two_factor_enabled',
                'value' => false,
                'category' => 'security',
                'description' => 'Activer l\'authentification à deux facteurs',
                'is_public' => false,
            ],

            // General settings
            [
                'key' => 'default_currency',
                'value' => 'EUR',
                'category' => 'general',
                'description' => 'Devise par défaut',
                'is_public' => true,
            ],
            [
                'key' => 'timezone',
                'value' => 'Europe/Paris',
                'category' => 'general',
                'description' => 'Fuseau horaire',
                'is_public' => true,
            ],
            [
                'key' => 'language',
                'value' => 'fr',
                'category' => 'general',
                'description' => 'Langue par défaut',
                'is_public' => true,
            ],
            [
                'key' => 'date_format',
                'value' => 'd/m/Y',
                'category' => 'general',
                'description' => 'Format de date',
                'is_public' => true,
            ],
            [
                'key' => 'time_format',
                'value' => 'H:i',
                'category' => 'general',
                'description' => 'Format d\'heure',
                'is_public' => true,
            ],

            // Sales settings
            [
                'key' => 'default_pipeline',
                'value' => 'default',
                'category' => 'sales',
                'description' => 'Pipeline par défaut',
                'is_public' => false,
            ],
            [
                'key' => 'lead_sources',
                'value' => ['Website', 'Email', 'Phone', 'Social Media', 'Referral', 'Other'],
                'category' => 'sales',
                'description' => 'Sources de leads',
                'is_public' => false,
            ],
            [
                'key' => 'opportunity_stages',
                'value' => ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
                'category' => 'sales',
                'description' => 'Étapes des opportunités',
                'is_public' => false,
            ],

            // System settings
            [
                'key' => 'data_retention_days',
                'value' => 365,
                'category' => 'system',
                'description' => 'Durée de rétention des données en jours',
                'is_public' => false,
            ],

            // Branding settings
            [
                'key' => 'primary_color',
                'value' => '#3B82F6',
                'category' => 'branding',
                'description' => 'Couleur principale',
                'is_public' => true,
            ],
            [
                'key' => 'secondary_color',
                'value' => '#10B981',
                'category' => 'branding',
                'description' => 'Couleur secondaire',
                'is_public' => true,
            ],
            [
                'key' => 'company_logo_url',
                'value' => '',
                'category' => 'branding',
                'description' => 'URL du logo',
                'is_public' => true,
            ],
        ];

        foreach ($settings as $setting) {
            // Ensure value is never null
            if ($setting['value'] === null) {
                $setting['value'] = '';
            }

            CrmSetting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }
}
