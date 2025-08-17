<?php

namespace App\Http\Requests\Documents;

use Illuminate\Foundation\Http\FormRequest;

class DocumentStoreRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array {
        return [
            'file' => ['required','file','max:25600','mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg'],
            'name' => ['sometimes','string','max:255'],
            'description' => ['nullable','string'],
            'visibility' => ['sometimes','in:private,team,company'],
            'tags' => ['nullable','array'],
            'tags.*' => ['string','max:30'],
            'links' => ['nullable','array'],
            'links.*.type' => ['required_with:links','in:company,contact'],
            'links.*.id' => ['required_with:links','integer'],
            'links.*.role' => ['nullable','string','max:50'],
        ];
    }
}
