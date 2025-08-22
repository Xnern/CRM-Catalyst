<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use App\Http\Resources\UserResource;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'name'           => $this->name,
            'domain'         => $this->domain ?? null,
            'industry'       => $this->industry ?? null,
            'size'           => $this->size ?? null,
            'status'         => $this->statusLabel ?? null,
            'owner'          => $this->whenLoaded('owner', fn () => new UserResource($this->owner), null),
            'address'        => $this->address ?? null,
            'city'           => $this->city ?? null,
            'zipcode'        => $this->zipcode ?? null,
            'country'        => $this->country ?? null,
            'notes'          => $this->notes ?? null,
            'contacts_count' => $this->when(isset($this->contacts_count), $this->contacts_count),
        ];
    }
}
