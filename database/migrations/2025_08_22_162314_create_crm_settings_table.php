<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('crm_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->string('category')->default('general');
            $table->text('description')->nullable();
            $table->boolean('is_public')->default(false); // Visible to all users vs admin only
            $table->timestamps();

            $table->index(['category', 'key']);
        });

        // Insert default settings
        $defaultSettings = [
            // General Settings
            ['key' => 'company_name', 'value' => json_encode(''), 'category' => 'general', 'description' => 'Company name', 'is_public' => true],
            ['key' => 'company_address', 'value' => json_encode(''), 'category' => 'general', 'description' => 'Company address', 'is_public' => true],
            ['key' => 'company_phone', 'value' => json_encode(''), 'category' => 'general', 'description' => 'Company phone', 'is_public' => true],
            ['key' => 'company_email', 'value' => json_encode(''), 'category' => 'general', 'description' => 'Company email', 'is_public' => true],
            ['key' => 'default_currency', 'value' => json_encode('USD'), 'category' => 'general', 'description' => 'Default currency', 'is_public' => true],
            ['key' => 'timezone', 'value' => json_encode('UTC'), 'category' => 'general', 'description' => 'Default timezone', 'is_public' => true],
            ['key' => 'language', 'value' => json_encode('en'), 'category' => 'general', 'description' => 'Default language', 'is_public' => true],

            // Email Settings
            ['key' => 'smtp_host', 'value' => json_encode(''), 'category' => 'email', 'description' => 'SMTP host', 'is_public' => false],
            ['key' => 'smtp_port', 'value' => json_encode('587'), 'category' => 'email', 'description' => 'SMTP port', 'is_public' => false],
            ['key' => 'smtp_username', 'value' => json_encode(''), 'category' => 'email', 'description' => 'SMTP username', 'is_public' => false],
            ['key' => 'smtp_password', 'value' => json_encode(''), 'category' => 'email', 'description' => 'SMTP password', 'is_public' => false],
            ['key' => 'email_from_name', 'value' => json_encode(''), 'category' => 'email', 'description' => 'From name', 'is_public' => true],
            ['key' => 'email_from_address', 'value' => json_encode(''), 'category' => 'email', 'description' => 'From email address', 'is_public' => true],

            // Sales Settings
            ['key' => 'default_pipeline', 'value' => json_encode('standard'), 'category' => 'sales', 'description' => 'Default sales pipeline', 'is_public' => true],
            ['key' => 'lead_sources', 'value' => json_encode(['Website', 'Referral', 'Cold Call', 'Trade Show', 'Social Media']), 'category' => 'sales', 'description' => 'Available lead sources', 'is_public' => true],
            ['key' => 'opportunity_stages', 'value' => json_encode(['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']), 'category' => 'sales', 'description' => 'Sales opportunity stages', 'is_public' => true],

            // System Settings
            ['key' => 'data_retention_days', 'value' => json_encode('365'), 'category' => 'system', 'description' => 'Data retention period in days', 'is_public' => false],
            ['key' => 'max_file_size_mb', 'value' => json_encode('10'), 'category' => 'system', 'description' => 'Maximum file size in MB', 'is_public' => true],
            ['key' => 'allowed_file_types', 'value' => json_encode(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg']), 'category' => 'system', 'description' => 'Allowed file types for uploads', 'is_public' => true],

            // Branding
            ['key' => 'company_logo_url', 'value' => json_encode(''), 'category' => 'branding', 'description' => 'Company logo URL', 'is_public' => true],
            ['key' => 'primary_color', 'value' => json_encode('#3b82f6'), 'category' => 'branding', 'description' => 'Primary brand color', 'is_public' => true],
            ['key' => 'secondary_color', 'value' => json_encode('#64748b'), 'category' => 'branding', 'description' => 'Secondary brand color', 'is_public' => true],
        ];

        foreach ($defaultSettings as $setting) {
            DB::table('crm_settings')->insert(array_merge($setting, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }

    public function down()
    {
        Schema::dropIfExists('crm_settings');
    }
};
