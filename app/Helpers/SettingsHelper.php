<?php

namespace App\Helpers;

use App\Services\SettingsService;

class SettingsHelper
{
    public static function getCssVariables(): string
    {
        $settings = SettingsService::getInstance();
        $brandingSettings = [
            'primary_color' => $settings->get('primary_color', '#0D9488'),
            'secondary_color' => $settings->get('secondary_color', '#10B981'),
        ];

        // Convert hex to HSL for CSS variables
        $primaryHsl = self::hexToHsl($brandingSettings['primary_color']);
        $secondaryHsl = self::hexToHsl($brandingSettings['secondary_color']);

        return ":root {
            --primary: {$primaryHsl};
            --secondary: {$secondaryHsl};
            --ring: {$primaryHsl};
        }";
    }

    public static function getSettingsForFrontend(): array
    {
        $settings = SettingsService::getInstance();

        return [
            'upload' => $settings->getUploadSettings(),
            'identity' => $settings->getIdentitySettings(),
            'security' => $settings->getSecuritySettings(),
            'branding' => [
                'primary_color' => $settings->get('primary_color', '#0D9488'),
                'secondary_color' => $settings->get('secondary_color', '#10B981'),
            ],
        ];
    }

    private static function hexToHsl(string $hex): string
    {
        // Remove # if present
        $hex = ltrim($hex, '#');

        // Convert hex to RGB
        $r = hexdec(substr($hex, 0, 2)) / 255;
        $g = hexdec(substr($hex, 2, 2)) / 255;
        $b = hexdec(substr($hex, 4, 2)) / 255;

        $max = max($r, $g, $b);
        $min = min($r, $g, $b);
        $l = ($max + $min) / 2;

        if ($max == $min) {
            $h = $s = 0;
        } else {
            $d = $max - $min;
            $s = $l > 0.5 ? $d / (2 - $max - $min) : $d / ($max + $min);

            switch ($max) {
                case $r:
                    $h = (($g - $b) / $d + ($g < $b ? 6 : 0)) / 6;
                    break;
                case $g:
                    $h = (($b - $r) / $d + 2) / 6;
                    break;
                case $b:
                    $h = (($r - $g) / $d + 4) / 6;
                    break;
                default:
                    $h = 0;
            }
        }

        $h = round($h * 360);
        $s = round($s * 100);
        $l = round($l * 100);

        return "{$h} {$s}% {$l}%";
    }
}
