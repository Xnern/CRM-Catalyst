<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('crm_settings')
            ->whereNull('value')
            ->update(['value' => json_encode([])]);

        Schema::table('crm_settings', function (Blueprint $table) {
            $table->json('value')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('crm_settings')
            ->whereNull('value')
            ->update(['value' => json_encode([])]);

        Schema::table('crm_settings', function (Blueprint $table) {
            $table->json('value')->nullable(false)->change();
        });
    }
};
