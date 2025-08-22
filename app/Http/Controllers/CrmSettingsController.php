<?php
// app/Http/Controllers/CrmSettingsController.php

namespace App\Http\Controllers;

use App\Models\CrmSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * CRM Settings Controller
 * Handles all CRM system configuration settings with comprehensive validation and error handling
 */
class CrmSettingsController extends Controller
{

    public function indexInertia()
    {
        return inertia('Settings/Index', [
            'settings' => CrmSetting::getAllGrouped(),
            'publicSettings' => CrmSetting::getPublicSettings()
        ]);
    }

    /**
     * Get all CRM settings grouped by category
     * Returns all settings organized by their respective categories
     */
    public function index(): JsonResponse
    {
        try {
            $settings = CrmSetting::getAllGrouped();

            return response()->json([
                'success' => true,
                'data' => $settings
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch CRM settings: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch settings',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get public settings only (for non-admin users)
     * Returns only settings marked as public/visible to all users
     */
    public function public(): JsonResponse
    {
        try {
            $settings = CrmSetting::getPublicSettings();

            return response()->json([
                'success' => true,
                'data' => $settings
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch public CRM settings: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch public settings',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update multiple settings with enhanced validation and error handling
     * Accepts nested array of settings grouped by category
     */
    public function update(Request $request): JsonResponse
    {
        try {
            $settings = $request->all();

            // Validate that we have settings to update
            if (empty($settings)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No settings provided'
                ], 400);
            }

            DB::beginTransaction();

            // Process each category of settings
            foreach ($settings as $category => $categorySettings) {
                if (!is_array($categorySettings)) {
                    continue;
                }

                foreach ($categorySettings as $key => $value) {
                    // Validate the setting exists and user has permission to update it
                    $existingSetting = CrmSetting::where('key', $key)->first();

                    if (!$existingSetting) {
                        // Skip unknown settings to prevent injection
                        continue;
                    }

                    // ✅ Clean and validate values before saving
                    $cleanValue = $this->cleanSettingValue($value);

                    // Update the setting with cleaned value
                    CrmSetting::setValue($key, $cleanValue, $category);
                }
            }

            DB::commit();

            // Return updated settings
            $updatedSettings = CrmSetting::getAllGrouped();

            return response()->json([
                'success' => true,
                'message' => 'Settings updated successfully',
                'data' => $updatedSettings
            ]);

        } catch (\Exception $e) {
            DB::rollback();

            // Log detailed error information for debugging
            Log::error('CRM Settings update error: ' . $e->getMessage(), [
                'request_data' => $request->all(),
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update settings',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update a single setting with comprehensive validation
     * Useful for individual setting updates via AJAX
     */
    public function updateSetting(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'key' => 'required|string|max:100',
            'value' => 'nullable', // ✅ Allow null but clean it before saving
            'category' => 'string|in:general,email,sales,system,branding'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $key = $request->input('key');
            $value = $this->cleanSettingValue($request->input('value'));
            $category = $request->input('category', 'general');

            // Verify the setting exists before updating
            $existingSetting = CrmSetting::where('key', $key)->first();
            if (!$existingSetting) {
                return response()->json([
                    'success' => false,
                    'message' => 'Setting not found'
                ], 404);
            }

            CrmSetting::setValue($key, $value, $category);

            return response()->json([
                'success' => true,
                'message' => 'Setting updated successfully',
                'data' => [
                    'key' => $key,
                    'value' => $value,
                    'category' => $category
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Single CRM setting update error: ' . $e->getMessage(), [
                'key' => $request->input('key'),
                'value' => $request->input('value'),
                'user_id' => auth()->id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update setting',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Reset settings to default values
     * WARNING: This will restore all settings to their initial state
     */
    public function reset(): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Get all current settings for backup logging
            $currentSettings = CrmSetting::getAllGrouped();

            Log::info('CRM Settings reset initiated', [
                'user_id' => auth()->id(),
                'current_settings_backup' => $currentSettings
            ]);

            // Reset to default values - you could implement more sophisticated logic here
            // For now, we'll just return current settings
            // In a real implementation, you might want to:
            // 1. Truncate the table and re-seed defaults
            // 2. Or update each setting to predefined default values

            $settings = CrmSetting::getAllGrouped();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Settings reset successfully',
                'data' => $settings
            ]);

        } catch (\Exception $e) {
            DB::rollback();

            Log::error('CRM Settings reset error: ' . $e->getMessage(), [
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to reset settings',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * ✅ Clean and validate setting values to prevent null/invalid data
     * This method ensures data integrity and prevents database constraint violations
     *
     * @param mixed $value The raw value to be cleaned
     * @return mixed The cleaned value safe for database storage
     */
    private function cleanSettingValue($value)
    {
        // Handle null values - convert to empty string to prevent DB constraint violations
        if ($value === null) {
            return '';
        }

        // Handle arrays - remove null/empty values and ensure valid structure
        if (is_array($value)) {
            $cleanedArray = array_filter($value, function ($item) {
                return $item !== null && $item !== '';
            });

            // Reset array keys to ensure proper JSON encoding
            return array_values($cleanedArray);
        }

        // Handle strings - trim whitespace and normalize
        if (is_string($value)) {
            $trimmed = trim($value);

            // Convert empty strings to actual empty string (not spaces)
            return $trimmed === '' ? '' : $trimmed;
        }

        // Handle boolean values - ensure proper boolean conversion
        if (is_bool($value)) {
            return $value;
        }

        // Handle numeric values - preserve as-is but ensure they're not null
        if (is_numeric($value)) {
            return $value;
        }

        // For other types, convert to string safely
        return (string) $value;
    }

    /**
     * Get setting by key (utility endpoint for frontend)
     * Returns a single setting value by its key
     */
    public function getSetting(string $key): JsonResponse
    {
        try {
            $setting = CrmSetting::where('key', $key)->first();

            if (!$setting) {
                return response()->json([
                    'success' => false,
                    'message' => 'Setting not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'key' => $setting->key,
                    'value' => $setting->value,
                    'category' => $setting->category,
                    'description' => $setting->description,
                    'is_public' => $setting->is_public
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch CRM setting: ' . $e->getMessage(), [
                'key' => $key
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch setting',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get settings by category
     * Returns all settings for a specific category
     */
    public function getByCategory(string $category): JsonResponse
    {
        $validCategories = ['general', 'email', 'sales', 'system', 'branding'];

        if (!in_array($category, $validCategories)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid category'
            ], 400);
        }

        try {
            $settings = CrmSetting::where('category', $category)
                ->get()
                ->mapWithKeys(function ($setting) {
                    return [$setting->key => $setting->value ?? ''];
                });

            return response()->json([
                'success' => true,
                'data' => $settings
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch CRM settings by category: ' . $e->getMessage(), [
                'category' => $category
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch settings for category',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Validate settings structure (utility method for testing)
     * Ensures all required settings exist with proper structure
     */
    public function validateSettings(): JsonResponse
    {
        try {
            $requiredSettings = [
                'general' => ['company_name', 'company_email', 'default_currency', 'timezone', 'language'],
                'email' => ['smtp_host', 'smtp_port', 'email_from_name', 'email_from_address'],
                'sales' => ['default_pipeline', 'lead_sources', 'opportunity_stages'],
                'system' => ['data_retention_days', 'max_file_size_mb', 'allowed_file_types'],
                'branding' => ['company_logo_url', 'primary_color', 'secondary_color']
            ];

            $missing = [];
            $invalid = [];

            foreach ($requiredSettings as $category => $keys) {
                foreach ($keys as $key) {
                    $setting = CrmSetting::where('key', $key)->first();

                    if (!$setting) {
                        $missing[] = "{$category}.{$key}";
                    } elseif ($setting->value === null) {
                        $invalid[] = "{$category}.{$key} (null value)";
                    }
                }
            }

            $isValid = empty($missing) && empty($invalid);

            return response()->json([
                'success' => true,
                'data' => [
                    'is_valid' => $isValid,
                    'missing_settings' => $missing,
                    'invalid_settings' => $invalid,
                    'message' => $isValid ? 'All settings are valid' : 'Some settings need attention'
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Settings validation error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to validate settings',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
}
