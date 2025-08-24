<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'category',
        'subject',
        'body',
        'variables',
        'is_active',
        'is_shared',
        'usage_count',
    ];

    protected $casts = [
        'variables' => 'array',
        'is_active' => 'boolean',
        'is_shared' => 'boolean',
        'usage_count' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Catégories disponibles
    public static function categories(): array
    {
        return [
            'general' => 'Général',
            'welcome' => 'Bienvenue',
            'follow_up' => 'Suivi',
            'proposal' => 'Proposition',
            'negotiation' => 'Négociation',
            'closing' => 'Clôture',
            'thank_you' => 'Remerciement',
            'meeting' => 'Réunion',
            'information' => 'Information',
        ];
    }

    // Variables disponibles pour le remplacement
    public static function availableVariables(): array
    {
        return [
            '{{contact_name}}' => 'Nom du contact',
            '{{contact_first_name}}' => 'Prénom du contact',
            '{{contact_email}}' => 'Email du contact',
            '{{company_name}}' => 'Nom de l\'entreprise',
            '{{opportunity_name}}' => 'Nom de l\'opportunité',
            '{{opportunity_amount}}' => 'Montant de l\'opportunité',
            '{{user_name}}' => 'Votre nom',
            '{{user_email}}' => 'Votre email',
            '{{user_phone}}' => 'Votre téléphone',
            '{{date}}' => 'Date du jour',
            '{{time}}' => 'Heure actuelle',
        ];
    }

    // Remplacer les variables dans le template
    public function render(array $data = []): array
    {
        $subject = $this->subject;
        $body = $this->body;

        // Ajouter les variables par défaut
        $defaultData = [
            '{{date}}' => now()->format('d/m/Y'),
            '{{time}}' => now()->format('H:i'),
            '{{user_name}}' => auth()->user()->name ?? '',
            '{{user_email}}' => auth()->user()->email ?? '',
        ];

        $data = array_merge($defaultData, $data);

        // Remplacer les variables
        foreach ($data as $key => $value) {
            $subject = str_replace($key, $value, $subject);
            $body = str_replace($key, $body, $body);
        }

        return [
            'subject' => $subject,
            'body' => $body,
        ];
    }

    // Incrémenter le compteur d'utilisation
    public function incrementUsage(): void
    {
        $this->increment('usage_count');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeShared($query)
    {
        return $query->where('is_shared', true);
    }

    public function scopePersonal($query)
    {
        return $query->where('user_id', auth()->id());
    }

    public function scopeAccessible($query)
    {
        return $query->where(function ($q) {
            $q->where('user_id', auth()->id())
              ->orWhere('is_shared', true);
        });
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }
}