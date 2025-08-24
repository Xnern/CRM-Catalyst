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
        Schema::table('events', function (Blueprint $table) {
            // Add user relationship if not exists
            if (!Schema::hasColumn('events', 'user_id')) {
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
            }
            
            // Add event categorization
            $table->string('type')->default('meeting'); // meeting, call, deadline, task, other
            $table->string('priority')->default('medium'); // low, medium, high
            $table->string('color')->nullable(); // Custom color for the event
            $table->boolean('all_day')->default(false);
            $table->string('location')->nullable();
            $table->json('attendees')->nullable(); // Store emails as JSON array
            
            // CRM integration columns
            $table->foreignId('contact_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('company_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('opportunity_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('reminder_id')->nullable()->constrained()->onDelete('set null');
            
            // Additional metadata
            $table->boolean('is_recurring')->default(false);
            $table->json('recurrence_config')->nullable(); // Store recurrence settings as JSON
            $table->text('notes')->nullable();
            $table->string('meeting_link')->nullable(); // Zoom, Teams, etc.
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            // Drop foreign keys first
            $table->dropForeign(['contact_id']);
            $table->dropForeign(['company_id']);
            $table->dropForeign(['opportunity_id']);
            $table->dropForeign(['reminder_id']);
            if (Schema::hasColumn('events', 'user_id')) {
                $table->dropForeign(['user_id']);
            }
            
            // Drop columns
            $table->dropColumn([
                'type', 'priority', 'color', 'all_day', 'location', 'attendees',
                'contact_id', 'company_id', 'opportunity_id', 'reminder_id',
                'is_recurring', 'recurrence_config', 'notes', 'meeting_link'
            ]);
            
            if (Schema::hasColumn('events', 'user_id')) {
                $table->dropColumn('user_id');
            }
        });
    }
};
