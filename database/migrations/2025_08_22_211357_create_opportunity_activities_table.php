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
        Schema::create('opportunity_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('opportunity_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained();
            
            // Activity type
            $table->enum('type', [
                'note',
                'call',
                'email',
                'meeting',
                'task',
                'stage_change',
                'amount_change',
                'other'
            ]);
            
            $table->string('title');
            $table->text('description')->nullable();
            
            // For stage changes
            $table->string('old_value')->nullable();
            $table->string('new_value')->nullable();
            
            // For scheduled activities
            $table->dateTime('scheduled_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['opportunity_id', 'type']);
            $table->index('scheduled_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('opportunity_activities');
    }
};