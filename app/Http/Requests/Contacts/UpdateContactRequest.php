<?php

namespace App\Http\Requests\Contacts;

use Illuminate\Validation\Rule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateContactRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $contact = $this->route('contact');

        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // Récupérer l'ID du contact que nous sommes en train de modifier
        // Laravel fait automatiquement l'injection de modèle si le paramètre de route est "contact"
        $contactId = $this->route('contact')->id;

        return [
            'name' => ['required', 'string', 'max:50'],
            'email' => [
                'nullable',
                'string',
                'email',
                'max:100',
                // La règle unique doit ignorer l'ID du contact actuel
                Rule::unique('contacts', 'email')->ignore($contactId),
            ],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^([+]?\d{1,3}[-. ]?)?(\(?\d{3}\)?[-. ]?)?\d{3}[-. ]?\d{4}$/'],
            'address' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Le nom du contact est obligatoire.',
            'name.max' => 'Le nom ne doit pas dépasser :max caractères.',
            'email.email' => 'Veuillez entrer une adresse email valide.',
            'email.max' => "L'email ne doit pas dépasser :max caractères.",
            'email.unique' => 'Cet e-mail est déjà utilisé par un autre contact.',
            'phone.regex' => 'Le numéro de téléphone n\'est pas valide.',
            'phone.max' => 'Le numéro de téléphone ne doit pas dépasser :max caractères.',
        ];
    }
}
