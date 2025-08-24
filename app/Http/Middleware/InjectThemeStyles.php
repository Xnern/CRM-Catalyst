<?php

namespace App\Http\Middleware;

use App\Services\SettingsService;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class InjectThemeStyles
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $settings = SettingsService::getInstance();
        
        // Get branding settings directly
        $primaryColor = $settings->get('primary_color', '#0d9488');
        $secondaryColor = $settings->get('secondary_color', '#64748b');
        
        // Share theme styles with all Inertia views
        Inertia::share('themeStyles', [
            'primaryColor' => $primaryColor,
            'secondaryColor' => $secondaryColor,
            'primaryHsl' => $this->hexToHsl($primaryColor),
            'secondaryHsl' => $this->hexToHsl($secondaryColor),
        ]);
        
        return $next($request);
    }
    
    /**
     * Convert hex color to HSL values for CSS
     */
    private function hexToHsl(string $hex): string
    {
        // Remove # if present
        $hex = ltrim($hex, '#');
        
        // Convert to RGB
        $r = hexdec(substr($hex, 0, 2)) / 255;
        $g = hexdec(substr($hex, 2, 2)) / 255;
        $b = hexdec(substr($hex, 4, 2)) / 255;
        
        $max = max($r, $g, $b);
        $min = min($r, $g, $b);
        $diff = $max - $min;
        
        // Calculate lightness
        $l = ($max + $min) / 2;
        
        if ($diff == 0) {
            $h = $s = 0;
        } else {
            // Calculate saturation
            if ($l < 0.5) {
                $s = $diff / ($max + $min);
            } else {
                $s = $diff / (2 - $max - $min);
            }
            
            // Calculate hue
            switch ($max) {
                case $r:
                    $h = (($g - $b) / $diff + ($g < $b ? 6 : 0));
                    break;
                case $g:
                    $h = (($b - $r) / $diff + 2);
                    break;
                case $b:
                    $h = (($r - $g) / $diff + 4);
                    break;
                default:
                    $h = 0;
            }
            $h = $h / 6;
        }
        
        // Convert to CSS HSL format
        $h = round($h * 360);
        $s = round($s * 100);
        $l = round($l * 100);
        
        return "{$h} {$s}% {$l}%";
    }
}