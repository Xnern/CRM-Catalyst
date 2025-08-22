<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\UserResource;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\ContactResource;

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
            'size_human' => $this->when(isset($this->size_human), $this->size_human),

            'storage_disk' => $this->when(isset($this->storage_disk), $this->storage_disk),
            'storage_path' => $this->when(isset($this->storage_path), $this->storage_path),

            'visibility' => $this->visibility,
            'description' => $this->when(isset($this->description), $this->description),
            'tags' => $this->tags ?? [],

            'owner' => $this->whenLoaded('owner', fn () => new UserResource($this->owner)),

            'companies' => $this->whenLoaded('companies', function () {
                return $this->companies->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                ]);
            }),

            'contacts' => $this->whenLoaded('contacts', function () {
                return $this->contacts->map(fn ($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'role' => optional($p->pivot)->role,
                ]);
            }),

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
