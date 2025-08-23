<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\EmailTemplate;
use App\Models\User;

class EmailTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (!$user) {
            $this->command->info('No users found. Please create a user first.');
            return;
        }

        $templates = [
            [
                'name' => 'Email de bienvenue',
                'category' => 'welcome',
                'subject' => 'Bienvenue chez nous, {{contact_first_name}} !',
                'body' => "Bonjour {{contact_name}},\n\nNous sommes ravis de vous accueillir parmi nos clients.\n\nNous avons bien reçu votre demande et nous allons la traiter dans les meilleurs délais.\n\nSi vous avez des questions, n'hésitez pas à nous contacter.\n\nCordialement,\n{{user_name}}\n{{user_email}}",
                'is_shared' => true,
            ],
            [
                'name' => 'Suivi après rendez-vous',
                'category' => 'follow_up',
                'subject' => 'Suite à notre rendez-vous du {{date}}',
                'body' => "Bonjour {{contact_name}},\n\nJe vous remercie pour notre rendez-vous de ce jour.\n\nComme convenu, voici un résumé des points abordés :\n- Point 1\n- Point 2\n- Point 3\n\nJe reste à votre disposition pour toute question.\n\nCordialement,\n{{user_name}}",
                'is_shared' => true,
            ],
            [
                'name' => 'Proposition commerciale',
                'category' => 'proposal',
                'subject' => 'Proposition commerciale - {{opportunity_name}}',
                'body' => "Bonjour {{contact_name}},\n\nSuite à nos échanges, j'ai le plaisir de vous adresser notre proposition commerciale pour le projet {{opportunity_name}}.\n\nMontant total : {{opportunity_amount}}\n\nVous trouverez en pièce jointe le détail de notre offre.\n\nJe reste à votre disposition pour en discuter.\n\nCordialement,\n{{user_name}}",
                'is_shared' => true,
            ],
            [
                'name' => 'Relance proposition',
                'category' => 'follow_up',
                'subject' => 'Relance - Proposition {{opportunity_name}}',
                'body' => "Bonjour {{contact_name}},\n\nJe me permets de revenir vers vous concernant notre proposition pour {{opportunity_name}} envoyée le [date].\n\nAvez-vous eu l'occasion de la consulter ? Avez-vous des questions ?\n\nJe serais ravi de planifier un appel pour en discuter.\n\nCordialement,\n{{user_name}}",
                'is_shared' => true,
            ],
            [
                'name' => 'Remerciement après signature',
                'category' => 'thank_you',
                'subject' => 'Merci pour votre confiance !',
                'body' => "Bonjour {{contact_name}},\n\nJe tiens à vous remercier pour votre confiance concernant le projet {{opportunity_name}}.\n\nNous allons maintenant démarrer la mise en œuvre et je reviendrai vers vous rapidement avec les prochaines étapes.\n\nÀ très bientôt,\n{{user_name}}",
                'is_shared' => true,
            ],
            [
                'name' => 'Invitation réunion',
                'category' => 'meeting',
                'subject' => 'Invitation - Réunion {{opportunity_name}}',
                'body' => "Bonjour {{contact_name}},\n\nJe vous propose de nous rencontrer pour discuter du projet {{opportunity_name}}.\n\nÊtes-vous disponible :\n- Option 1 : [Date et heure]\n- Option 2 : [Date et heure]\n- Option 3 : [Date et heure]\n\nMerci de me confirmer le créneau qui vous convient le mieux.\n\nCordialement,\n{{user_name}}",
                'is_shared' => false,
            ],
            [
                'name' => 'Email de négociation',
                'category' => 'negotiation',
                'subject' => 'Proposition ajustée - {{opportunity_name}}',
                'body' => "Bonjour {{contact_name}},\n\nSuite à nos échanges, j'ai le plaisir de vous proposer une offre ajustée pour {{opportunity_name}}.\n\nNouveau montant : {{opportunity_amount}}\n\nCette offre inclut :\n- [Détail 1]\n- [Détail 2]\n- [Détail 3]\n\nJ'espère que cette proposition répondra à vos attentes.\n\nCordialement,\n{{user_name}}",
                'is_shared' => false,
            ],
            [
                'name' => 'Information produit',
                'category' => 'information',
                'subject' => 'Information sur nos services',
                'body' => "Bonjour {{contact_name}},\n\nComme demandé, voici des informations complémentaires sur nos services.\n\n[Détails des services]\n\nJe reste à votre disposition pour toute question.\n\nCordialement,\n{{user_name}}\n{{user_phone}}",
                'is_shared' => true,
            ],
        ];

        foreach ($templates as $template) {
            EmailTemplate::create([
                ...$template,
                'user_id' => $user->id,
                'variables' => $this->extractVariables($template['body'] . ' ' . $template['subject']),
            ]);
        }

        $this->command->info(count($templates) . ' email templates created successfully!');
    }

    private function extractVariables(string $text): array
    {
        preg_match_all('/\{\{([^}]+)\}\}/', $text, $matches);
        return array_unique($matches[0]);
    }
}