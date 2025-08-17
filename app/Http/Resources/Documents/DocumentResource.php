<?php

namespace App\Http\Resources\Documents;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'original_filename' => $this->original_filename,
            'mime_type' => $this->mime_type,
            'extension' => $this->extension,
            'size_bytes' => $this->size_bytes,
            'size_human' => $this->size_human,
            'storage_disk' => $this->storage_disk,
            'storage_path' => $this->storage_path,
            'visibility' => $this->visibility,
            'description' => $this->description,
            'tags' => $this->tags ?? [],
            'owner' => [
                'id' => $this->owner?->id,
                'name' => $this->owner?->name,
            ],
            'companies' => $this->whenLoaded('companies', fn() => $this->companies->map(fn($c) => [
                'id' => $c->id, 'name' => $c->name, 'role' => $c->pivot->role,
            ])),
            'contacts' => $this->whenLoaded('contacts', fn() => $this->contacts->map(fn($c) => [
                'id' => $c->id, 'name' => $c->name, 'role' => $c->pivot->role,
            ])),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
