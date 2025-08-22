<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage-settings');
    }

    public function rules(): array
    {
        return [
            // Upload settings
            'upload_allowed_extensions' => ['sometimes', 'array'],
            'upload_allowed_extensions.*' => ['string', 'max:10'],
            'upload_max_file_size' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'upload_storage_path' => ['sometimes', 'string', 'max:255'],

            // Identity settings
            'company_name' => ['sometimes', 'string', 'max:255'],
            'company_logo' => ['nullable', 'string', 'max:255'],
            'company_email' => ['sometimes', 'email', 'max:255'],
            'company_phone' => ['nullable', 'string', 'max:50'],
            'company_address' => ['nullable', 'string', 'max:255'],
            'company_city' => ['nullable', 'string', 'max:100'],
            'company_postal_code' => ['nullable', 'string', 'max:20'],
            'company_country' => ['nullable', 'string', 'max:100'],

            // Email settings
            'smtp_host' => ['sometimes', 'string', 'max:255'],
            'smtp_port' => ['sometimes', 'integer', 'min:1', 'max:65535'],
            'smtp_username' => ['nullable', 'string', 'max:255'],
            'smtp_password' => ['nullable', 'string', 'max:255'],
            'smtp_encryption' => ['nullable', 'in:tls,ssl,'],
            'mail_from_address' => ['sometimes', 'email', 'max:255'],
            'mail_from_name' => ['sometimes', 'string', 'max:255'],

            // Security settings
            'session_lifetime' => ['sometimes', 'integer', 'min:5', 'max:525600'],
            'password_min_length' => ['sometimes', 'integer', 'min:6', 'max:32'],
            'password_require_uppercase' => ['sometimes', 'boolean'],
            'password_require_lowercase' => ['sometimes', 'boolean'],
            'password_require_numbers' => ['sometimes', 'boolean'],
            'password_require_special_chars' => ['sometimes', 'boolean'],
            'two_factor_enabled' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'upload_allowed_extensions.array' => 'Les extensions autorisées doivent être un tableau.',
            'upload_allowed_extensions.*.string' => 'Chaque extension doit être une chaîne de caractères.',
            'upload_allowed_extensions.*.max' => 'Chaque extension ne peut pas dépasser 10 caractères.',
            'upload_max_file_size.integer' => 'La taille maximale doit être un nombre entier.',
            'upload_max_file_size.min' => 'La taille maximale doit être au moins 1 MB.',
            'upload_max_file_size.max' => 'La taille maximale ne peut pas dépasser 100 MB.',

            'company_name.string' => 'Le nom de l\'entreprise doit être une chaîne de caractères.',
            'company_name.max' => 'Le nom de l\'entreprise ne peut pas dépasser 255 caractères.',
            'company_email.email' => 'L\'email de l\'entreprise doit être une adresse email valide.',
            'company_email.max' => 'L\'email de l\'entreprise ne peut pas dépasser 255 caractères.',

            'smtp_host.string' => 'L\'hôte SMTP doit être une chaîne de caractères.',
            'smtp_port.integer' => 'Le port SMTP doit être un nombre entier.',
            'smtp_port.min' => 'Le port SMTP doit être au moins 1.',
            'smtp_port.max' => 'Le port SMTP ne peut pas dépasser 65535.',
            'smtp_encryption.in' => 'Le chiffrement SMTP doit être tls, ssl ou vide.',

            'session_lifetime.integer' => 'La durée de session doit être un nombre entier.',
            'session_lifetime.min' => 'La durée de session doit être au moins 5 minutes.',
            'session_lifetime.max' => 'La durée de session ne peut pas dépasser 525600 minutes (1 an).',
            'password_min_length.integer' => 'La longueur minimale du mot de passe doit être un nombre entier.',
            'password_min_length.min' => 'La longueur minimale du mot de passe doit être au moins 6.',
            'password_min_length.max' => 'La longueur minimale du mot de passe ne peut pas dépasser 32.',
        ];
    }
}
