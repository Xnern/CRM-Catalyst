<?php

namespace App\Http\Requests\Companies;

use App\Enums\CompanyStatus;
use Illuminate\Validation\Rule;
use Illuminate\Foundation\Http\FormRequest;

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
            'status' => ['sometimes','string', Rule::in(CompanyStatus::values())],
            'owner_id' => ['nullable','exists:users,id'],
            'address' => ['nullable','string','max:255'],
            'city' => ['nullable','string','max:255'],
            'zipcode' => ['nullable','string','max:50'],
            'country' => ['nullable','string','max:255'],
            'notes' => ['nullable','string'],
        ];
    }
}