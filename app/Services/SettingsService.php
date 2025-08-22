<?php

namespace App\Services;

use App\Models\CrmSetting;
use Illuminate\Support\Facades\Cache;

class SettingsService
{
    protected static ?self $instance = null;

    protected array $settings = [];

    protected bool $loaded = false;

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self;
        }

        return self::$instance;
    }

    protected function loadSettings(): void
    {
        if (! $this->loaded) {
            $this->settings = Cache::remember('crm_settings', 3600, function () {
                return CrmSetting::all()->mapWithKeys(function ($setting) {
                    return [$setting->key => $setting->value ?? ''];
                })->toArray();
            });
            $this->loaded = true;
        }
    }

    public function get(string $key, $default = null)
    {
        $this->loadSettings();

        return $this->settings[$key] ?? $default;
    }

    public function set(string $key, $value, string $category = 'general'): void
    {
        CrmSetting::setValue($key, $value, $category);
        $this->clearCache();
    }

    public function clearCache(): void
    {
        Cache::forget('crm_settings');
        $this->loaded = false;
        $this->settings = [];
    }

    public function getUploadSettings(): array
    {
        return [
            'allowed_extensions' => $this->get('upload_allowed_extensions', ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']),
            'max_file_size' => $this->get('upload_max_file_size', 10), // MB
            'storage_path' => $this->get('upload_storage_path', 'documents'),
        ];
    }

    public function getIdentitySettings(): array
    {
        return [
            'company_name' => $this->get('company_name', config('app.name')),
            'company_logo' => $this->get('company_logo'),
            'company_email' => $this->get('company_email'),
            'company_phone' => $this->get('company_phone'),
            'company_address' => $this->get('company_address'),
            'company_city' => $this->get('company_city'),
            'company_postal_code' => $this->get('company_postal_code'),
            'company_country' => $this->get('company_country'),
        ];
    }

    public function getEmailSettings(): array
    {
        return [
            'smtp_host' => $this->get('smtp_host', config('mail.mailers.smtp.host')),
            'smtp_port' => $this->get('smtp_port', config('mail.mailers.smtp.port')),
            'smtp_username' => $this->get('smtp_username', config('mail.mailers.smtp.username')),
            'smtp_password' => $this->get('smtp_password', config('mail.mailers.smtp.password')),
            'smtp_encryption' => $this->get('smtp_encryption', config('mail.mailers.smtp.encryption')),
            'from_address' => $this->get('mail_from_address', config('mail.from.address')),
            'from_name' => $this->get('mail_from_name', config('mail.from.name')),
        ];
    }

    public function getSecuritySettings(): array
    {
        return [
            'session_lifetime' => $this->get('session_lifetime', 120),
            'password_min_length' => $this->get('password_min_length', 8),
            'password_require_uppercase' => $this->get('password_require_uppercase', true),
            'password_require_lowercase' => $this->get('password_require_lowercase', true),
            'password_require_numbers' => $this->get('password_require_numbers', true),
            'password_require_special_chars' => $this->get('password_require_special_chars', false),
            'two_factor_enabled' => $this->get('two_factor_enabled', false),
        ];
    }

    public function getBrandingSettings(): array
    {
        return [
            'company_logo_url' => $this->get('company_logo_url', ''),
            'primary_color' => $this->get('primary_color', '#0d9488'),
            'secondary_color' => $this->get('secondary_color', '#64748b'),
        ];
    }

    public function all(): array
    {
        $this->loadSettings();

        return $this->settings;
    }

    public function getAllGrouped(): array
    {
        return CrmSetting::getAllGrouped();
    }
}
