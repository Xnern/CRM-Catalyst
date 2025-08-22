<?php

namespace App\Rules;

use App\Services\SettingsService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

class AllowedFileExtension implements ValidationRule
{
    protected array $allowedExtensions;

    public function __construct()
    {
        $settingsService = SettingsService::getInstance();
        $uploadSettings = $settingsService->getUploadSettings();
        $this->allowedExtensions = $uploadSettings['allowed_extensions'] ?? ['jpg', 'jpeg', 'png'];
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile) {
            $fail('Le fichier n\'est pas valide.');

            return;
        }

        $extension = strtolower($value->getClientOriginalExtension());

        if (! in_array($extension, $this->allowedExtensions)) {
            $fail('Le type de fichier n\'est pas autorisé. Extensions acceptées : '.implode(', ', $this->allowedExtensions));
        }
    }
}
