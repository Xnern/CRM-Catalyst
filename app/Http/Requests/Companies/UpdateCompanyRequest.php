<?php

namespace App\Http\Requests\Companies;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes','required','string','max:255'],
            'domain' => ['sometimes','nullable','string','max:255'],
            'industry' => ['sometimes','nullable','string','max:255'],
            'size' => ['sometimes','nullable','string','max:50'],
            'status' => ['sometimes','nullable', Rule::in(['Prospect','Client','Inactif'])],
            'owner_id' => ['sometimes','nullable','exists:users,id'],
            'address' => ['sometimes','nullable','string','max:255'],
            'city' => ['sometimes','nullable','string','max:255'],
            'zipcode' => ['sometimes','nullable','string','max:50'],
            'country' => ['sometimes','nullable','string','max:255'],
            'notes' => ['sometimes','nullable','string'],
        ];
    }
}