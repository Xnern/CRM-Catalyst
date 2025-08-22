<?php

namespace App\Enums;

enum ContactStatus: string
{
    case NOUVEAU = 'nouveau';
    case QUALIFICATION = 'qualification';
    case PROPOSITION_ENVOYEE = 'proposition_envoyee';
    case NEGOCIATION = 'negociation';
    case CONVERTI = 'converti';
    case PERDU = 'perdu';

    public function label(): string
    {
        return match ($this) {
            self::NOUVEAU => 'Nouveau',
            self::QUALIFICATION => 'Qualification',
            self::PROPOSITION_ENVOYEE => 'Proposition envoyée',
            self::NEGOCIATION => 'Négociation',
            self::CONVERTI => 'Converti',
            self::PERDU => 'Perdu',
        };
    }

    public static function options(): array
    {
        // Pour le front: [['value' => 'nouveau', 'label' => 'Nouveau'], ...]
        return array_map(
            fn(self $s) => ['value' => $s->value, 'label' => $s->label()],
            self::cases()
        );
    }

    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }

    public static function labels(): array
    {
        return array_map(fn(self $s) => $s->label(), self::cases());
    }
}
