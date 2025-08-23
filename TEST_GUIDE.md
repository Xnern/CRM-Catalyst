# 🧪 Guide de Test des Nouvelles Fonctionnalités

## 📋 Fonctionnalités à Tester

### 1. 🔔 Système de Rappels et Notifications

**Accès direct :** http://localhost:8000/reminders

**Tests à effectuer :**
- ✅ Voir l'icône de notification dans la navbar (cloche avec badge)
- ✅ Cliquer sur la cloche pour voir les rappels à venir
- ✅ Créer un rappel rapide depuis le menu de notification
- ✅ Reporter un rappel (5 min, 15 min, 30 min, 1h, 4h, demain)
- ✅ Marquer un rappel comme complété
- ✅ Supprimer un rappel avec la modale de confirmation

**Données de test disponibles :**
- 5 rappels ont été créés automatiquement via le seeder
- Un rappel en retard pour tester l'affichage rouge
- Un rappel pour aujourd'hui
- Des rappels à venir

### 2. 📊 Statistiques du Pipeline

**Accès direct :** http://localhost:8000/kanban/stats

**Tests à effectuer :**
- ✅ Voir les graphiques avec Recharts
- ✅ Répartition par stage (donut chart)
- ✅ Top 10 des opportunités
- ✅ Évolution temporelle
- ✅ Statistiques par utilisateur

### 3. 🔍 Filtres Avancés dans le Kanban

**Accès direct :** http://localhost:8000/kanban

**Tests à effectuer :**
- ✅ Cliquer sur l'icône de filtre
- ✅ Rechercher par nom/contact/entreprise
- ✅ Filtrer par utilisateur
- ✅ Filtrer par plage de dates
- ✅ Filtrer par montant (min/max)
- ✅ Sauvegarder un filtre personnalisé
- ✅ Charger un filtre sauvegardé
- ✅ Supprimer un filtre sauvegardé

### 4. 📥📤 Import/Export CSV

**Accès direct :** http://localhost:8000/kanban

**Tests à effectuer :**
- ✅ Bouton "Exporter" dans le Kanban
- ✅ Télécharger le template CSV
- ✅ Exporter les opportunités (avec ou sans filtres)
- ✅ Importer un fichier CSV
- ✅ Vérifier la mise à jour des opportunités existantes

### 5. 📜 Timeline d'Activités

**API disponible :** `/api/opportunities/{id}/timeline`

**Tests à effectuer :**
- ✅ Les modifications sur les opportunités sont automatiquement loggées
- ✅ Ajouter une note rapide via l'API
- ✅ Voir l'historique groupé par période
- ✅ Voir les différents types d'événements avec icônes

### 6. 📧 Templates d'Emails

**Accès direct :** http://localhost:8000/email-templates

**Tests à effectuer :**
- ✅ Voir les 8 templates créés automatiquement
- ✅ Templates organisés par catégorie
- ✅ Variables dynamiques affichées
- ✅ Créer un nouveau template
- ✅ Dupliquer un template existant
- ✅ Preview avec remplacement des variables
- ✅ Compteur d'utilisation

## 🚀 Comment Tester

### Via l'Interface Web :

1. **Rappels :**
   - Cliquez sur l'icône de cloche dans la navbar
   - Créez un rappel avec le bouton "Créer un rappel"
   - Testez les options de report sur un rappel existant

2. **Statistiques :**
   - Dans le Kanban, cliquez sur l'icône de graphique (BarChart3)
   - Explorez les différents graphiques

3. **Filtres :**
   - Dans le Kanban, cliquez sur l'icône de filtre
   - Testez différentes combinaisons de filtres
   - Sauvegardez un filtre avec un nom

4. **Import/Export :**
   - Dans le Kanban, utilisez les boutons "Exporter" et "Importer"
   - Téléchargez d'abord le template pour voir le format

### Via Tinker (pour tester les modèles) :

```bash
php artisan tinker
```

```php
// Tester les rappels
$reminder = \App\Models\Reminder::first();
$reminder->snooze(30); // Reporter de 30 minutes
$reminder->markAsCompleted(); // Marquer comme complété

// Tester les templates d'emails
$template = \App\Models\EmailTemplate::first();
$rendered = $template->render([
    '{{contact_name}}' => 'Jean Dupont',
    '{{opportunity_name}}' => 'Projet Test',
    '{{opportunity_amount}}' => '10 000 €'
]);
print_r($rendered);

// Tester le logging d'activité
$opportunity = \App\Models\Opportunity::first();
$opportunity->amount = 15000;
$opportunity->save(); // Cela créera automatiquement un log

// Voir les logs d'activité
$logs = \App\Models\ActivityLog::where('subject_type', 'App\Models\Opportunity')
    ->where('subject_id', $opportunity->id)
    ->get();
```

### Via l'API (avec curl ou Postman) :

```bash
# Récupérer la timeline d'une opportunité
curl -X GET http://localhost:8000/api/opportunities/1/timeline \
  -H "Accept: application/json" \
  -H "Cookie: [votre_session_cookie]"

# Ajouter une note rapide
curl -X POST http://localhost:8000/api/opportunities/1/timeline/note \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: [csrf_token]" \
  -d '{"content": "Note de test depuis l\'API"}'

# Récupérer les templates d'emails
curl -X GET http://localhost:8000/api/email-templates \
  -H "Accept: application/json"
```

## 📝 Notes Importantes

1. **Données de Test :** Les seeders ont créé des données d'exemple pour toutes les fonctionnalités
2. **Permissions :** Connectez-vous avec un utilisateur ayant les bonnes permissions
3. **Rafraîchissement :** Les notifications se rafraîchissent automatiquement toutes les minutes
4. **Localisation :** Tout est en français par défaut

## 🐛 En cas de problème

Si une fonctionnalité ne s'affiche pas :
1. Vérifiez que `npm run dev` est en cours d'exécution
2. Rafraîchissez la page avec Ctrl+F5
3. Vérifiez la console du navigateur pour les erreurs
4. Vérifiez les logs Laravel : `tail -f storage/logs/laravel.log`