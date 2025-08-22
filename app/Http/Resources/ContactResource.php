<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\CompanyResource;

class ContactResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'name' => $this->name,
            'status' => $this->status,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'user_id' => $this->user_id,
            'created_at' => optional($this->created_at)->toISOString(),
            'updated_at' => optional($this->updated_at)->toISOString(),

            // Relations
            'user' => $this->whenLoaded('user', function () {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ];
            }),
            'company' => $this->whenLoaded('company', function () {
                return new CompanyResource($this->company);
            }),
            'documents' => $this->whenLoaded('documents', function () {
                return $this->documents->map(function ($document) {
                    return [
                        'id' => $document->id,
                        'uuid' => $document->uuid,
                        'name' => $document->name,
                        'original_filename' => $document->original_filename,
                        'extension' => $document->extension,
                        'mime_type' => $document->mime_type,
                        'size_bytes' => $document->size_bytes,
                        'visibility' => $document->visibility,
                        'description' => $document->description,
                        'tags' => $document->tags,
                        'created_at' => optional($document->created_at)->toISOString(),
                        // ✅ Données du pivot (role depuis la table documentables)
                        'role' => $document->pivot->role ?? null,
                    ];
                })->toArray();
            }, []),
        ];
    }
}
