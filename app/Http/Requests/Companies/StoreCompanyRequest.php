<?php

namespace App\Http\Requests\Companies;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'name' => ['required','string','max:255'],
            'domain' => ['nullable','string','max:255'],
            'industry' => ['nullable','string','max:255'],
            'size' => ['nullable','string','max:50'],
            'status' => ['nullable', Rule::in(['Prospect','Client','Inactif'])],
            'owner_id' => ['nullable','exists:users,id'],
            'address' => ['nullable','string','max:255'],
            'city' => ['nullable','string','max:255'],
            'zipcode' => ['nullable','string','max:50'],
            'country' => ['nullable','string','max:255'],
            'notes' => ['nullable','string'],
        ];
    }
}