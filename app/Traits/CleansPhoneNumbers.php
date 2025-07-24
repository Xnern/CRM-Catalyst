<?php

namespace App\Traits;

trait CleansPhoneNumbers
{
    /**
     * Cleans a phone number by removing non-digit characters,
     * while preserving an optional leading '+'.
     *
     * @param string|null $phone The phone number to clean.
     * @return string|null The cleaned phone number, or null if input was null.
     */
    protected function cleanPhoneNumber(?string $phone): ?string
    {
        if (is_null($phone)) {
            return null;
        }
        // Remove all characters except digits and a leading '+'
        $cleanedPhone = preg_replace('/[^\d+]/', '', $phone);
        // Remove any '+' signs that are not at the beginning of the string
        $cleanedPhone = preg_replace('/(?<!^)\+/', '', $cleanedPhone);

        return $cleanedPhone;
    }
}
