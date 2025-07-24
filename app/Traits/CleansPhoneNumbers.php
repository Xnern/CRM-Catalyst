<?php

namespace App\Traits;

trait CleansPhoneNumbers
{
    /**
     * Nettoie un numéro de téléphone en supprimant les caractères non numériques,
     * mais en conservant un éventuel '+' en début de chaîne.
     *
     * @param string|null $phone
     * @return string|null
     */
    protected function cleanPhoneNumber(?string $phone): ?string
    {
        if (is_null($phone)) {
            return null;
        }
        // Supprime tout sauf les chiffres et un '+'
        $cleanedPhone = preg_replace('/[^\d+]/', '', $phone);
        // Supprime les '+' qui ne sont PAS en début de chaîne
        $cleanedPhone = preg_replace('/(?<!^)\+/', '', $cleanedPhone);

        return $cleanedPhone;
    }
}
