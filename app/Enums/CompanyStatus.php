<?php

namespace App\Enums;

enum CompanyStatus: string
{
    case PROSPECT = 'Prospect';
    case CLIENT = 'Client';
    case INACTIF = 'Inactif';

    public function label(): string
    {
        return match ($this) {
            self::PROSPECT => 'Prospect',
            self::CLIENT => 'Client',
            self::INACTIF => 'Inactif',
        };
    }

    public static function options(): array
    {
        return array_map(
            fn(self $s) => ['value' => $s->value, 'label' => $s->label()],
            self::cases()
        );
    }

    public static function values(): array
    {
        return array_map(fn(self $s) => $s->value, self::cases());
    }
}
