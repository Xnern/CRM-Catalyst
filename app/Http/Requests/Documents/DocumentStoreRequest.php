<?php

namespace App\Http\Requests\Documents;

use Illuminate\Foundation\Http\FormRequest;

class DocumentStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    public function prepareForValidation(): void
    {
        if ($this->has('links') && is_string($this->input('links'))) {
            $linksJson = $this->input('links');
            $linksArray = json_decode($linksJson, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $linksArray = [];
            }

            $this->merge([
                'links' => $linksArray,
            ]);
        }

        if (!$this->has('links')) {
            $this->merge([
                'links' => [],
            ]);
        }

        if ($this->has('tags') && is_string($this->input('tags'))) {
            $tagsJson = $this->input('tags');
            $tagsArray = json_decode($tagsJson, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $tagsArray = [];
            }

            $this->merge([
                'tags' => $tagsArray,
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:25600',
                'mimes:pdf,doc,docx,rtf,odt,xls,xlsx,xlsm,ods,csv,ppt,pptx,odp,txt,md,png,jpg,jpeg,gif,bmp,tiff,webp,svg,zip'
            ],

            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'visibility' => ['sometimes', 'in:private,team,company'],

            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:30'],

            'links' => ['nullable', 'array'],
            'links.*.type' => ['required_with:links.*', 'in:company,contact'],
            'links.*.id' => ['required_with:links.*', 'integer', 'min:1'],
            'links.*.name' => ['sometimes', 'string', 'max:255'],
            'links.*.role' => ['nullable', 'string', 'max:50'],
        ];
    }

    /**
     * Error messages for validation rules
     */
    public function messages(): array
    {
        return [
            'file.required' => 'Un fichier est obligatoire.',
            'file.file' => 'Le fichier uploadé n\'est pas valide.',
            'file.max' => 'Le fichier ne peut pas dépasser 25MB.',
            'file.mimes' => 'Le type de fichier n\'est pas autorisé.',

            'name.string' => 'Le nom doit être une chaîne de caractères.',
            'name.max' => 'Le nom ne peut pas dépasser 255 caractères.',

            'description.string' => 'La description doit être une chaîne de caractères.',
            'description.max' => 'La description ne peut pas dépasser 1000 caractères.',

            'visibility.in' => 'La visibilité doit être private, team ou company.',

            'tags.array' => 'Les tags doivent être un tableau.',
            'tags.*.string' => 'Chaque tag doit être une chaîne de caractères.',
            'tags.*.max' => 'Chaque tag ne peut pas dépasser 30 caractères.',

            'links.array' => 'Les liens doivent être un tableau.',
            'links.*.type.required_with' => 'Le type est obligatoire pour chaque lien.',
            'links.*.type.in' => 'Le type doit être company ou contact.',
            'links.*.id.required_with' => 'L\'ID est obligatoire pour chaque lien.',
            'links.*.id.integer' => 'L\'ID doit être un nombre entier.',
            'links.*.id.min' => 'L\'ID doit être supérieur à 0.',
            'links.*.name.string' => 'Le nom doit être une chaîne de caractères.',
            'links.*.name.max' => 'Le nom ne peut pas dépasser 255 caractères.',
            'links.*.role.string' => 'Le rôle doit être une chaîne de caractères.',
            'links.*.role.max' => 'Le rôle ne peut pas dépasser 50 caractères.',
        ];
    }

    /**
     * Attributs to human-readable names
     */
    public function attributes(): array
    {
        return [
            'file' => 'fichier',
            'name' => 'nom',
            'description' => 'description',
            'visibility' => 'visibilité',
            'tags' => 'tags',
            'links' => 'liens',
            'links.*.type' => 'type de lien',
            'links.*.id' => 'ID du lien',
            'links.*.name' => 'nom du lien',
            'links.*.role' => 'rôle du lien',
        ];
    }

    /**
     * Accessor to get cleaned links as array
     */
    public function getLinks(): array
    {
        $links = $this->input('links', []);

        if (!is_array($links)) {
            return [];
        }

        return $links;
    }

    /**
     * Accessor for tags
     */
    public function getTags(): array
    {
        $tags = $this->input('tags', []);

        if (!is_array($tags)) {
            return [];
        }

        return $tags;
    }
}
