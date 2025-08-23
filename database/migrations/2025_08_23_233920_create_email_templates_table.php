<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('category')->default('general');
            $table->string('subject');
            $table->text('body');
            $table->json('variables')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_shared')->default(false);
            $table->integer('usage_count')->default(0);
            $table->timestamps();
            
            $table->index(['user_id', 'is_active']);
            $table->index('category');
            $table->index('is_shared');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_templates');
    }
};