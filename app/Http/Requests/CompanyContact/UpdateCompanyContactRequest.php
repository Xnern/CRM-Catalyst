<?php

namespace App\Http\Requests\CompanyContact;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $contactParam = $this->route('contact');
        $contactId = is_object($contactParam) ? $contactParam->id : $contactParam;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes', 'required', 'email', 'max:255',
                Rule::unique('contacts', 'email')->ignore($contactId),
            ],
            'phone' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'user_id' => ['nullable', 'exists:users,id'],
        ];
    }

    public function prepareForValidation(): void
    {
        // Ne trim que les champs présents dans la requête (sometimes)
        $payload = [];

        if ($this->has('name')) {
            $payload['name'] = $this->name ? trim($this->name) : $this->name;
        }
        if ($this->has('email')) {
            $payload['email'] = $this->email ? trim($this->email) : $this->email;
        }
        if ($this->has('phone')) {
            $payload['phone'] = $this->phone ? trim($this->phone) : $this->phone;
        }
        if ($this->has('status')) {
            $payload['status'] = $this->status ? trim($this->status) : $this->status;
        }
        if ($this->has('address')) {
            $payload['address'] = $this->address ? trim($this->address) : $this->address;
        }

        $this->merge($payload);
    }
}
