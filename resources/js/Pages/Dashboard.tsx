import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';
import { Badge } from '@/Components/ui/badge';
import { RefreshCw, Users, Building, FileText, Calendar, TrendingUp, TrendingDown, Eye, Clock, User, Tag } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  useGetDashboardStatsQuery,
  useGetContactsByStatusApiQuery,
  useGetCompaniesByStatusApiQuery,
  useGetContactsTimelineApiQuery,
  useGetDocumentsTimelineApiQuery,
  useGetRecentActivitiesApiQuery,
} from '@/services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface Activity {
  type: 'contact' | 'company' | 'document' | 'activity';
  title: string;
  date: string;
  id: number;
  subject_id?: number;
  subject_type?: string;
  properties?: Record<string, any>;
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, trend, trendLabel }) => {
  const isPositive = trend && trend > 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              {trend !== undefined && (
                <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="ml-1">{Math.abs(trend)}</span>
                  {trendLabel && <span className="ml-1">{trendLabel}</span>}
                </div>
              )}
            </div>
          </div>
          <div className="text-blue-600">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
};

const ActivityDetailModal: React.FC<{ activity: Activity | null; isOpen: boolean; onClose: () => void }> = ({
  activity,
  isOpen,
  onClose,
}) => {
  if (!activity) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'contact': return <Users className="h-5 w-5" />;
      case 'company': return <Building className="h-5 w-5" />;
      case 'document': return <FileText className="h-5 w-5" />;
      default: return <Calendar className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'contact': return 'bg-blue-100 text-blue-800';
      case 'company': return 'bg-green-100 text-green-800';
      case 'document': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contact': return 'Contact';
      case 'company': return 'Entreprise';
      case 'document': return 'Document';
      default: return 'Activité';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'bg-green-100 text-green-800';
      case 'updated': return 'bg-yellow-100 text-yellow-800';
      case 'deleted': return 'bg-red-100 text-red-800';
      case 'uploaded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created': return 'Créé';
      case 'updated': return 'Mis à jour';
      case 'deleted': return 'Supprimé';
      case 'uploaded': return 'Ajouté';
      case 'status_changed': return 'Statut modifié';
      default: return action;
    }
  };

  const getSubjectTypeLabel = (subjectType: string) => {
    const type = subjectType.split('\\').pop()?.toLowerCase();
    switch (type) {
      case 'contact': return 'Contact';
      case 'company': return 'Entreprise';
      case 'document': return 'Document';
      case 'user': return 'Utilisateur';
      default: return subjectType.split('\\').pop() || '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    const units = ['o', 'Ko', 'Mo', 'Go'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon(activity.type)}
            Détails de l'activité
          </DialogTitle>
          <DialogDescription>
            Informations complètes sur cette activité
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header avec titre et badges */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-medium">{activity.title}</h3>
              <Badge className={getTypeColor(activity.type)}>
                {getTypeLabel(activity.type)}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(activity.date).toLocaleString('fr-FR')}
              </div>
            </div>
          </div>

          {/* Informations sur l'objet */}
          {activity.subject_type && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Objet concerné</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Type :</span>
                  <Badge variant="outline">
                    {getSubjectTypeLabel(activity.subject_type)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Détails de l'action */}
          {activity.properties && Object.keys(activity.properties).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Détails de l'action</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activity.properties.action && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Action :</span>
                    <Badge className={getActionColor(activity.properties.action)}>
                      {getActionLabel(activity.properties.action)}
                    </Badge>
                  </div>
                )}

                {activity.properties.size && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Taille :</span>
                    <span className="text-sm">{formatFileSize(activity.properties.size)}</span>
                  </div>
                )}

                {activity.properties.old_status && activity.properties.new_status && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Ancien statut :</span>
                      <Badge variant="outline">{activity.properties.old_status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Nouveau statut :</span>
                      <Badge variant="outline">{activity.properties.new_status}</Badge>
                    </div>
                  </div>
                )}

                {activity.properties.changes && Object.keys(activity.properties.changes).length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 block mb-2">Modifications :</span>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                      {Object.entries(activity.properties.changes).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="font-medium">{key} :</span>
                          <span className="text-gray-600 max-w-xs truncate">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Affichage de toutes les autres propriétés (sans les IDs) */}
                {Object.entries(activity.properties)
                  .filter(([key]) => !['action', 'size', 'old_status', 'new_status', 'changes', 'contact_id', 'company_id', 'document_id'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600 capitalize">
                        {key.replace(/_/g, ' ')} :
                      </span>
                      <span className="text-sm max-w-xs truncate">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))
                }
              </CardContent>
            </Card>
          )}

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            {activity.subject_type && activity.subject_id && (
              <Button variant="default" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Voir l'objet
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const RecentActivityItem: React.FC<{ activity: Activity; onViewDetails: (activity: Activity) => void }> = ({
  activity,
  onViewDetails
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'contact': return <Users className="h-4 w-4" />;
      case 'company': return <Building className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contact': return 'Contact';
      case 'company': return 'Entreprise';
      case 'document': return 'Document';
      default: return 'Activité';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created': return 'créé';
      case 'updated': return 'mis à jour';
      case 'deleted': return 'supprimé';
      case 'uploaded': return 'ajouté';
      case 'status_changed': return 'statut modifié';
      default: return action;
    }
  };

  return (
    <div
      className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => onViewDetails(activity)}
    >
      <div className="text-gray-400">{getIcon(activity.type)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{activity.title}</p>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>{getTypeLabel(activity.type)}</span>
          {activity.properties?.action && (
            <>
              <span>•</span>
              <Badge variant="secondary" className="h-4 text-xs py-0">
                {getActionLabel(activity.properties.action)}
              </Badge>
            </>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-400">
          {new Date(activity.date).toLocaleDateString('fr-FR')}
        </p>
        <p className="text-xs text-gray-400">
          {new Date(activity.date).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
};

export default function Dashboard({ auth }) {
  const { data: statsData, isLoading: isLoadingStats, refetch: refetchStats } = useGetDashboardStatsQuery();
  const { data: contactsByStatusData, isLoading: isLoadingContacts } = useGetContactsByStatusApiQuery();
  const { data: companiesByStatusData, isLoading: isLoadingCompanies } = useGetCompaniesByStatusApiQuery();
  const { data: contactsTimelineData, isLoading: isLoadingContactsTimeline } = useGetContactsTimelineApiQuery(6);
  const { data: documentsTimelineData, isLoading: isLoadingDocumentsTimeline } = useGetDocumentsTimelineApiQuery(6);
  const { data: recentActivitiesData, isLoading: isLoadingActivities } = useGetRecentActivitiesApiQuery(8);

  // États pour la modale
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Safe data extraction with fallbacks
  const stats = statsData?.data || {
    total_contacts: 0,
    total_companies: 0,
    total_documents: 0,
    total_events: 0,
    contacts_this_month: 0,
    companies_this_month: 0,
  };

  const contactsData = contactsByStatusData?.data || [];
  const companiesData = companiesByStatusData?.data || [];
  const contactsTimeline = contactsTimelineData?.data || [];
  const documentsTimeline = documentsTimelineData?.data || [];
  const activities = recentActivitiesData?.data || [];

  // Combine timeline data
  const combinedTimeline = contactsTimeline.map((item) => {
    const docItem = documentsTimeline.find(d => d.month === item.month);
    return {
      month: item.month,
      contacts: item.contacts || 0,
      documents: docItem?.documents || 0,
    };
  });

  const handleRefresh = () => {
    refetchStats();
  };

  const handleViewActivityDetails = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsActivityModalOpen(true);
  };

  const handleCloseActivityModal = () => {
    setIsActivityModalOpen(false);
    setSelectedActivity(null);
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <AuthenticatedLayout
      user={auth.user}
      header={<h2 className="font-semibold text-xl">Tableau de bord</h2>}
    >
      <Head title="Tableau de bord" />

      <div className="py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">Vue d'ensemble</h3>
            <p className="text-gray-500 text-sm">Statistiques et activités récentes</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" disabled={isLoadingStats}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Contacts"
            value={stats.total_contacts}
            icon={<Users className="h-8 w-8" />}
            trend={stats.contacts_this_month}
            trendLabel="ce mois"
          />
          <StatsCard
            title="Total Entreprises"
            value={stats.total_companies}
            icon={<Building className="h-8 w-8" />}
            trend={stats.companies_this_month}
            trendLabel="ce mois"
          />
          <StatsCard
            title="Total Documents"
            value={stats.total_documents}
            icon={<FileText className="h-8 w-8" />}
          />
          <StatsCard
            title="Total Événements"
            value={stats.total_events}
            icon={<Calendar className="h-8 w-8" />}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Contacts by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition des contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingContacts ? (
                <div className="h-64 flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              ) : contactsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={contactsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {contactsData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Aucune donnée disponible
                </div>
              )}
            </CardContent>
          </Card>

          {/* Companies by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition des entreprises</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingCompanies ? (
                <div className="h-64 flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              ) : companiesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={companiesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {companiesData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Aucune donnée disponible
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Evolution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution sur 6 mois</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingContactsTimeline || isLoadingDocumentsTimeline ? (
              <div className="h-64 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : combinedTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={combinedTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="contacts"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Contacts"
                  />
                  <Line
                    type="monotone"
                    dataKey="documents"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Documents"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Aucune donnée d'évolution disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Activités récentes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingActivities ? (
              <div className="py-4 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-1">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <RecentActivityItem
                      key={`${activity.type}-${activity.id}`}
                      activity={activity}
                      onViewDetails={handleViewActivityDetails}
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">Aucune activité récente</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Activity Details Modal */}
      <ActivityDetailModal
        activity={selectedActivity}
        isOpen={isActivityModalOpen}
        onClose={handleCloseActivityModal}
      />
    </AuthenticatedLayout>
  );
}
