<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('opportunity_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('contact_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->datetime('reminder_date');
            $table->enum('type', ['follow_up', 'meeting', 'call', 'email', 'deadline', 'other'])->default('follow_up');
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium');
            $table->enum('status', ['pending', 'completed', 'snoozed', 'cancelled'])->default('pending');
            $table->datetime('completed_at')->nullable();
            $table->datetime('snoozed_until')->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->string('recurrence_pattern')->nullable(); // daily, weekly, monthly
            $table->integer('recurrence_interval')->nullable(); // every X days/weeks/months
            $table->date('recurrence_end_date')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'reminder_date', 'status']);
            $table->index(['opportunity_id']);
            $table->index(['contact_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminders');
    }
};