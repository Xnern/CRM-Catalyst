<?php

namespace App\Http\Middleware;

use App\Services\SettingsService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Symfony\Component\HttpFoundation\Response;

class ApplySecuritySettings
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            $settings = SettingsService::getInstance();
            $securitySettings = $settings->getSecuritySettings();
            
            // Apply session lifetime
            if (!empty($securitySettings['session_lifetime'])) {
                Config::set('session.lifetime', (int)$securitySettings['session_lifetime']);
            }
            
            // Store security settings for use in validation rules
            Config::set('security.password_min_length', $securitySettings['password_min_length'] ?? 8);
            Config::set('security.password_require_uppercase', $securitySettings['password_require_uppercase'] ?? false);
            Config::set('security.password_require_lowercase', $securitySettings['password_require_lowercase'] ?? false);
            Config::set('security.password_require_numbers', $securitySettings['password_require_numbers'] ?? false);
            Config::set('security.password_require_special_chars', $securitySettings['password_require_special_chars'] ?? false);
            Config::set('security.two_factor_enabled', $securitySettings['two_factor_enabled'] ?? false);
            
        } catch (\Exception $e) {
            // Log error but continue - don't break the application
            \Log::warning('Could not apply security settings: ' . $e->getMessage());
        }
        
        return $next($request);
    }
}