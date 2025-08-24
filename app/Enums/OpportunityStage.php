<?php

namespace App\Enums;

enum OpportunityStage: string
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

    public function color(): string
    {
        return match ($this) {
            self::NOUVEAU => 'blue',
            self::QUALIFICATION => 'yellow',
            self::PROPOSITION_ENVOYEE => 'purple',
            self::NEGOCIATION => 'orange',
            self::CONVERTI => 'green',
            self::PERDU => 'red',
        };
    }

    public function probability(): int
    {
        return match ($this) {
            self::NOUVEAU => 10,
            self::QUALIFICATION => 25,
            self::PROPOSITION_ENVOYEE => 50,
            self::NEGOCIATION => 75,
            self::CONVERTI => 100,
            self::PERDU => 0,
        };
    }

    public static function options(): array
    {
        return array_map(
            fn (self $s) => [
                'value' => $s->value,
                'label' => $s->label(),
                'color' => $s->color(),
                'probability' => $s->probability(),
            ],
            self::cases()
        );
    }

    public static function values(): array
    {
        return array_map(fn (self $s) => $s->value, self::cases());
    }

    public static function labels(): array
    {
        $labels = [];
        foreach (self::cases() as $case) {
            $labels[$case->value] = $case->label();
        }

        return $labels;
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::CONVERTI, self::PERDU]);
    }

    public function isOpen(): bool
    {
        return ! $this->isFinal();
    }
}
