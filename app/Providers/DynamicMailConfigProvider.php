<?php

namespace App\Providers;

use App\Services\SettingsService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\ServiceProvider;

class DynamicMailConfigProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Load mail settings from database
        try {
            $settings = SettingsService::getInstance();
            $emailSettings = $settings->getEmailSettings();
            
            // Update mail configuration dynamically
            if (!empty($emailSettings['smtp_host'])) {
                Config::set('mail.default', 'smtp');
                Config::set('mail.mailers.smtp.host', $emailSettings['smtp_host']);
            }
            
            if (!empty($emailSettings['smtp_port'])) {
                Config::set('mail.mailers.smtp.port', $emailSettings['smtp_port']);
            }
            
            if (!empty($emailSettings['smtp_username'])) {
                Config::set('mail.mailers.smtp.username', $emailSettings['smtp_username']);
            }
            
            if (!empty($emailSettings['smtp_password'])) {
                Config::set('mail.mailers.smtp.password', $emailSettings['smtp_password']);
            }
            
            // Set encryption if specified
            if (!empty($emailSettings['smtp_encryption'])) {
                Config::set('mail.mailers.smtp.encryption', $emailSettings['smtp_encryption']);
            }
            
            // Set from address and name
            if (!empty($emailSettings['email_from_address'])) {
                Config::set('mail.from.address', $emailSettings['email_from_address']);
            }
            
            if (!empty($emailSettings['email_from_name'])) {
                Config::set('mail.from.name', $emailSettings['email_from_name']);
            }
        } catch (\Exception $e) {
            // If settings cannot be loaded, fall back to env configuration
            \Log::warning('Could not load dynamic mail settings: ' . $e->getMessage());
        }
    }
}