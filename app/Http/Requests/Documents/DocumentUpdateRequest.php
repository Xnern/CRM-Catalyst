<?php

namespace App\Http\Requests\Documents;

use Illuminate\Foundation\Http\FormRequest;

class DocumentUpdateRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array {
        return [
            'name' => ['sometimes','string','max:255'],
            'description' => ['nullable','string'],
            'visibility' => ['sometimes','in:private,team,company'],
            'tags' => ['nullable','array'],
            'tags.*' => ['string','max:30'],
        ];
    }
}
