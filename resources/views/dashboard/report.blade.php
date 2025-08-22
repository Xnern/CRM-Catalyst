<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport Dashboard CRM</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            color: #333;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #0d9488;
            padding-bottom: 20px;
        }

        .header h1 {
            color: #0d9488;
            margin: 0;
            font-size: 28px;
        }

        .header .subtitle {
            color: #666;
            margin: 5px 0;
        }

        .stats-grid {
            display: table;
            width: 100%;
            margin-bottom: 40px;
        }

        .stats-row {
            display: table-row;
        }

        .stat-card {
            display: table-cell;
            width: 25%;
            padding: 15px;
            text-align: center;
            border: 1px solid #ddd;
            background-color: #f8f9fa;
        }

        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #0d9488;
        }

        .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }

        .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }

        .section h2 {
            color: #0d9488;
            border-bottom: 1px solid #0d9488;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }

        .status-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .status-table th,
        .status-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }

        .status-table th {
            background-color: #f0fdfa;
            font-weight: bold;
            color: #0d9488;
        }

        .timeline-table {
            width: 100%;
            border-collapse: collapse;
        }

        .timeline-table th,
        .timeline-table td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: center;
        }

        .timeline-table th {
            background-color: #f0fdfa;
            color: #0d9488;
            font-weight: bold;
        }

        .activities-list {
            margin-top: 20px;
        }

        .activity-item {
            padding: 10px;
            margin-bottom: 8px;
            background-color: #f8f9fa;
            border-left: 3px solid #0d9488;
        }

        .activity-date {
            font-size: 11px;
            color: #666;
            float: right;
        }

        .footer {
            text-align: center;
            margin-top: 50px;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }

        .page-break {
            page-break-before: always;
        }

        .status-table tbody tr:nth-child(even) {
            background-color: #fcfefe;
        }

        .timeline-table tbody tr:nth-child(even) {
            background-color: #fcfefe;
        }

        .activity-item strong {
            color: #0d9488;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <h1>Rapport Dashboard CRM</h1>
        <div class="subtitle">Généré pour {{ $user->name }}</div>
        <div class="subtitle">Le {{ $generated_at }}</div>
    </div>

    <!-- Statistiques générales -->
    <div class="section">
        <h2>Vue d'ensemble</h2>
        <div class="stats-grid">
            <div class="stats-row">
                <div class="stat-card">
                    <div class="stat-value">{{ $stats['total_contacts'] }}</div>
                    <div class="stat-label">Total Contacts</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{{ $stats['total_companies'] }}</div>
                    <div class="stat-label">Total Entreprises</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{{ $stats['total_documents'] }}</div>
                    <div class="stat-label">Total Documents</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{{ $stats['total_events'] }}</div>
                    <div class="stat-label">Total Événements</div>
                </div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stats-row">
                <div class="stat-card">
                    <div class="stat-value">{{ $stats['contacts_this_month'] }}</div>
                    <div class="stat-label">Contacts ce mois</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">{{ $stats['companies_this_month'] }}</div>
                    <div class="stat-label">Entreprises ce mois</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">-</div>
                    <div class="stat-label">Documents ce mois</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">-</div>
                    <div class="stat-label">Événements ce mois</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Répartition des contacts -->
    <div class="section">
        <h2>Répartition des contacts par statut</h2>
        @if($contactsByStatus->count() > 0)
            <table class="status-table">
                <thead>
                    <tr>
                        <th>Statut</th>
                        <th>Nombre</th>
                        <th>Pourcentage</th>
                    </tr>
                </thead>
                <tbody>
                    @php $totalContacts = $contactsByStatus->sum('value'); @endphp
                    @foreach($contactsByStatus as $status)
                        <tr>
                            <td>{{ $status['name'] }}</td>
                            <td>{{ $status['value'] }}</td>
                            <td>{{ $totalContacts > 0 ? round(($status['value'] / $totalContacts) * 100, 1) : 0 }}%</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <p>Aucune donnée disponible pour les contacts.</p>
        @endif
    </div>

    <div class="section">
        <h2>Répartition des entreprises par statut</h2>
        @if($companiesByStatus->count() > 0)
            <table class="status-table">
                <thead>
                    <tr>
                        <th>Statut</th>
                        <th>Nombre</th>
                        <th>Pourcentage</th>
                    </tr>
                </thead>
                <tbody>
                    @php $totalCompanies = $companiesByStatus->sum('value'); @endphp
                    @foreach($companiesByStatus as $status)
                        <tr>
                            <td>{{ $status['name'] }}</td>
                            <td>{{ $status['value'] }}</td>
                            <td>{{ $totalCompanies > 0 ? round(($status['value'] / $totalCompanies) * 100, 1) : 0 }}%</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <p>Aucune donnée disponible pour les entreprises.</p>
        @endif
    </div>

    <div class="page-break"></div>

    <div class="section">
        <h2>Évolution sur les 6 derniers mois</h2>
        @if($contactsTimeline->count() > 0 || $documentsTimeline->count() > 0)
            <table class="timeline-table">
                <thead>
                    <tr>
                        <th>Mois</th>
                        <th>Contacts créés</th>
                        <th>Documents ajoutés</th>
                    </tr>
                </thead>
                <tbody>
                    @php
                        $allMonths = $contactsTimeline->pluck('month')->merge($documentsTimeline->pluck('month'))->unique()->sort();
                    @endphp
                    @foreach($allMonths as $month)
                        <tr>
                            <td>{{ $month }}</td>
                            <td>{{ $contactsTimeline->firstWhere('month', $month)['contacts'] ?? 0 }}</td>
                            <td>{{ $documentsTimeline->firstWhere('month', $month)['documents'] ?? 0 }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <p>Aucune donnée d'évolution disponible.</p>
        @endif
    </div>

    <div class="section">
        <h2>Activités récentes (10 dernières)</h2>
        @if($recentActivities->count() > 0)
            <div class="activities-list">
                @foreach($recentActivities as $activity)
                    <div class="activity-item">
                        <span class="activity-date">{{ $activity['date'] }}</span>
                        <strong>{{ ucfirst($activity['type']) }}</strong>: {{ $activity['description'] }}
                    </div>
                @endforeach
            </div>
        @else
            <p>Aucune activité récente.</p>
        @endif
    </div>

    <div class="footer">
        <p>Rapport généré automatiquement par le CRM Catalyst</p>
        <p>{{ $generated_at }}</p>
    </div>
</body>
</html>
