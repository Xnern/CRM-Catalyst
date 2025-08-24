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
        Schema::create('opportunities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            
            // Relations
            $table->foreignId('contact_id')->constrained()->onDelete('cascade');
            $table->foreignId('company_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('user_id')->constrained()->comment('Sales rep / Owner');
            
            // Financial information
            $table->decimal('amount', 15, 2)->default(0);
            $table->string('currency', 3)->default('EUR');
            $table->integer('probability')->default(0)->comment('Probability in percentage 0-100');
            $table->decimal('weighted_amount', 15, 2)->virtualAs('amount * probability / 100');
            
            // Sales stage (using same enum as contacts for consistency)
            $table->enum('stage', [
                'nouveau',
                'qualification', 
                'proposition_envoyee',
                'negociation',
                'converti',
                'perdu'
            ])->default('nouveau');
            
            // Important dates
            $table->date('expected_close_date')->nullable();
            $table->date('actual_close_date')->nullable();
            
            // Additional information
            $table->string('lead_source')->nullable()->comment('Source of the lead');
            $table->string('loss_reason')->nullable()->comment('Reason if lost');
            $table->text('next_step')->nullable()->comment('Next action to take');
            
            // Products/Services
            $table->json('products')->nullable()->comment('Array of products/services');
            
            // Competition
            $table->string('competitors')->nullable();
            
            // Metadata
            $table->json('custom_fields')->nullable();
            $table->timestamps();
            
            // Indexes for performance
            $table->index('stage');
            $table->index('expected_close_date');
            $table->index('user_id');
            $table->index(['company_id', 'stage']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('opportunities');
    }
};