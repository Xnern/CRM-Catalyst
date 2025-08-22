<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CrmSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'category',
        'description',
        'is_public'
    ];

    protected $casts = [
        'value' => 'array',
        'is_public' => 'boolean'
    ];

    /**
     * Get a setting value by key
     */
    public static function getValue(string $key, $default = null)
    {
        $setting = static::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    /**
     * Set a setting value by key
     */
    public static function setValue(string $key, $value, string $category = 'general'): void
    {
        if ($value === null || $value === '') {
            $value = '';
        }

        static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'category' => $category
            ]
        );
    }

    /**
     * Get all settings grouped by category
     */
    public static function getAllGrouped(): array
    {
        return static::all()
            ->groupBy('category')
            ->map(function ($settings) {
                return $settings->mapWithKeys(function ($setting) {
                    return [$setting->key => $setting->value ?? ''];
                });
            })
            ->toArray();
    }

    /**
     * Get public settings only
     */
    public static function getPublicSettings(): array
    {
        return static::where('is_public', true)
            ->get()
            ->mapWithKeys(function ($setting) {
                return [$setting->key => $setting->value ?? ''];
            })
            ->toArray();
    }
}
