<?php

namespace App\Http\Requests\CompanyContact;

use App\Traits\CleansPhoneNumbers;
use Illuminate\Foundation\Http\FormRequest;

class StoreCompanyContactRequest extends FormRequest
{
    use CleansPhoneNumbers;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $cleanedPhone = $this->cleanPhoneNumber($this->input('phone'));

        $latitude = $this->input('latitude');
        $longitude = $this->input('longitude');

        $parsedLatitude = is_numeric($latitude) ? (float) $latitude : null;
        $parsedLongitude = is_numeric($longitude) ? (float) $longitude : null;

        $this->merge([
            'phone' => $cleanedPhone,
            'latitude' => $parsedLatitude,
            'longitude' => $parsedLongitude,
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'string', 'email', 'max:255', 'unique:contacts,email'],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^\+?\d{10,15}$/'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Le nom du contact est obligatoire.',
            'name.max' => 'Le nom ne doit pas dépasser :max caractères.',
            'email.email' => 'Veuillez entrer une adresse email valide.',
            'email.max' => "L'email ne doit pas dépasser :max caractères.",
            'email.unique' => 'Cet e-mail est déjà utilisé.',
            'phone.regex' => 'Le numéro de téléphone n\'est pas valide (ex: +33612345678).',
            'phone.max' => 'Le numéro de téléphone ne doit pas dépasser :max caractères.',
            'latitude.numeric' => 'La latitude doit être un nombre.',
            'latitude.between' => 'La latitude doit être entre -90 et 90.',
            'longitude.numeric' => 'La longitude doit être un nombre.',
            'longitude.between' => 'La longitude doit être entre -180 et 180.',
        ];
    }
}
