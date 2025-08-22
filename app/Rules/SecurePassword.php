<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Config;

class SecurePassword implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $password = $value;
        $errors = [];
        
        // Check minimum length
        $minLength = Config::get('security.password_min_length', 8);
        if (strlen($password) < $minLength) {
            $errors[] = "Le mot de passe doit contenir au moins {$minLength} caractères.";
        }
        
        // Check uppercase requirement
        if (Config::get('security.password_require_uppercase', false) && !preg_match('/[A-Z]/', $password)) {
            $errors[] = "Le mot de passe doit contenir au moins une majuscule.";
        }
        
        // Check lowercase requirement
        if (Config::get('security.password_require_lowercase', false) && !preg_match('/[a-z]/', $password)) {
            $errors[] = "Le mot de passe doit contenir au moins une minuscule.";
        }
        
        // Check numbers requirement
        if (Config::get('security.password_require_numbers', false) && !preg_match('/[0-9]/', $password)) {
            $errors[] = "Le mot de passe doit contenir au moins un chiffre.";
        }
        
        // Check special characters requirement
        if (Config::get('security.password_require_special_chars', false) && !preg_match('/[^A-Za-z0-9]/', $password)) {
            $errors[] = "Le mot de passe doit contenir au moins un caractère spécial.";
        }
        
        // If there are errors, fail validation
        if (!empty($errors)) {
            $fail(implode(' ', $errors));
        }
    }
}