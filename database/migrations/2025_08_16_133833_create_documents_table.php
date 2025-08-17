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
        Schema::create('documents', function (Blueprint $t) {
            $t->id();
            $t->uuid('uuid')->unique();
            $t->string('name');
            $t->string('original_filename');
            $t->string('mime_type');
            $t->string('extension')->nullable();
            $t->unsignedBigInteger('size_bytes');
            $t->string('storage_disk')->default('s3');
            $t->string('storage_path');
            $t->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $t->string('visibility')->default('private'); // private, team, company
            $t->text('description')->nullable();
            $t->json('tags')->nullable();
            $t->timestamps();
            $t->softDeletes();
            $t->index(['name']);
            $t->index(['owner_id']);
            $t->index(['visibility']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
