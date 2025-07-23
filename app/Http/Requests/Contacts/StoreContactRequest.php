<?php

namespace App\Http\Requests\Contacts;

use Illuminate\Foundation\Http\FormRequest;

class StoreContactRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'string', 'email', 'max:100', 'unique:contacts,email'],
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
            'email.unique' => 'Cet e-mail est déjà utilisé.',
            'phone.regex' => 'Le numéro de téléphone n\'est pas valide.',
            'phone.max' => 'Le numéro de téléphone ne doit pas dépasser :max caractères.',
        ];
    }
}
