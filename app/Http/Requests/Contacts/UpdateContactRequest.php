<?php

namespace App\Http\Requests\Contacts;

use Illuminate\Validation\Rule;
use Illuminate\Foundation\Http\FormRequest;
use App\Traits\CleansPhoneNumbers; // Importer le trait

class UpdateContactRequest extends FormRequest
{
    use CleansPhoneNumbers; // Utiliser le trait

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $contact = $this->route('contact');
        return true;
    }

    /**
     * Prepare the data for validation.
     * C'est ici que nous nettoyons le numéro de téléphone avant d'appliquer les règles.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => $this->cleanPhoneNumber($this->input('phone')),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $contactId = $this->route('contact')->id;

        return [
            'name' => ['required', 'string', 'max:50'],
            'email' => [
                'nullable',
                'string',
                'email',
                'max:100',
                Rule::unique('contacts', 'email')->ignore($contactId),
            ],
            // La regex est appliquée au numéro déjà nettoyé
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^\+?\d{10,15}$/'],
            'address' => ['nullable', 'string', 'max:255'],
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
            'email.unique' => 'Cet e-mail est déjà utilisé par un autre contact.',
            'phone.regex' => 'Le numéro de téléphone n\'est pas valide (ex: +33612345678).',
            'phone.max' => 'Le numéro de téléphone ne doit pas dépasser :max caractères.',
        ];
    }
}
