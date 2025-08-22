import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/Components/ui/dialog';
import { Badge } from '@/Components/ui/badge';
import { RefreshCw, Users, Building, FileText, Calendar, TrendingUp, TrendingDown, Eye, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
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

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Activity interface definition
interface Activity {
  type: 'contact' | 'company' | 'document' | 'activity';
  title: string;
  date: string;
  id: number;
  subject_id?: number;
  subject_type?: string;
  properties?: Record<string, any>;
}

// Stats card component props interface
interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
}

/**
 * Statistics card component displaying key metrics with trends
 */
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

// Activity detail modal props interface
interface ActivityDetailModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal component for displaying detailed activity information
 */
const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  isOpen,
  onClose,
}) => {
  if (!activity) return null;

  // Get appropriate icon for activity type
  const getIcon = (type: string) => {
    switch (type) {
      case 'contact': return <Users className="h-5 w-5" />;
      case 'company': return <Building className="h-5 w-5" />;
      case 'document': return <FileText className="h-5 w-5" />;
      default: return <Calendar className="h-5 w-5" />;
    }
  };

  // Get color scheme for activity type
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'contact': return 'bg-blue-100 text-blue-800';
      case 'company': return 'bg-green-100 text-green-800';
      case 'document': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get human-readable label for activity type
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contact': return 'Contact';
      case 'company': return 'Company';
      case 'document': return 'Document';
      default: return 'Activity';
    }
  };

  // Get color scheme for action type
  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'bg-green-100 text-green-800';
      case 'updated': return 'bg-yellow-100 text-yellow-800';
      case 'deleted': return 'bg-red-100 text-red-800';
      case 'uploaded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get human-readable label for action type
  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created': return 'Created';
      case 'updated': return 'Updated';
      case 'deleted': return 'Deleted';
      case 'uploaded': return 'Uploaded';
      case 'status_changed': return 'Status Changed';
      default: return action;
    }
  };

  // Get human-readable label for subject type
  const getSubjectTypeLabel = (subjectType: string) => {
    const type = subjectType.split('\\').pop()?.toLowerCase();
    switch (type) {
      case 'contact': return 'Contact';
      case 'company': return 'Company';
      case 'document': return 'Document';
      case 'user': return 'User';
      default: return subjectType.split('\\').pop() || '';
    }
  };

  // Format file size in human-readable format
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Handle navigation to related object
  const handleViewObject = () => {
    if (!activity.subject_type || !activity.subject_id) {
      toast.error('Unable to redirect to this object');
      return;
    }

    const type = activity.subject_type.split('\\').pop()?.toLowerCase();
    const id = activity.subject_id;

    if (!type) {
      toast.error('Unrecognized object type');
      return;
    }

    router.visit(`/dashboard/redirect-object/${type}/${id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon(activity.type)}
            Activity Details
          </DialogTitle>
          <DialogDescription>
            Complete information about this activity
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with title and badges */}
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
                {new Date(activity.date).toLocaleString('en-US')}
              </div>
            </div>
          </div>

          {/* Related object information */}
          {activity.subject_type && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Related Object</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Type:</span>
                  <Badge variant="outline">
                    {getSubjectTypeLabel(activity.subject_type)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action details */}
          {activity.properties && Object.keys(activity.properties).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Action Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activity.properties.action && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Action:</span>
                    <Badge className={getActionColor(activity.properties.action)}>
                      {getActionLabel(activity.properties.action)}
                    </Badge>
                  </div>
                )}

                {activity.properties.size && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Size:</span>
                    <span className="text-sm">{formatFileSize(activity.properties.size)}</span>
                  </div>
                )}

                {activity.properties.old_status && activity.properties.new_status && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">Old Status:</span>
                      <Badge variant="outline">{activity.properties.old_status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">New Status:</span>
                      <Badge variant="outline">{activity.properties.new_status}</Badge>
                    </div>
                  </div>
                )}

                {activity.properties.changes && Object.keys(activity.properties.changes).length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 block mb-2">Changes:</span>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                      {Object.entries(activity.properties.changes).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="font-medium">{key}:</span>
                          <span className="text-gray-600 max-w-xs truncate">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Display all other properties (excluding IDs) */}
                {Object.entries(activity.properties)
                  .filter(([key]) => !['action', 'size', 'old_status', 'new_status', 'changes', 'contact_id', 'company_id', 'document_id'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600 capitalize">
                        {key.replace(/_/g, ' ')}:
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

          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {activity.subject_type && activity.subject_id && (
              <Button
                onClick={handleViewObject}
                variant="default"
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View Object
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Recent activity item component for the activity list
 */
const RecentActivityItem: React.FC<{ activity: Activity; onViewDetails: (activity: Activity) => void }> = ({
  activity,
  onViewDetails
}) => {
  // Get appropriate icon for activity type
  const getIcon = (type: string) => {
    switch (type) {
      case 'contact': return <Users className="h-4 w-4" />;
      case 'company': return <Building className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  // Get human-readable label for activity type
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contact': return 'Contact';
      case 'company': return 'Company';
      case 'document': return 'Document';
      default: return 'Activity';
    }
  };

  // Get human-readable label for action (lowercase for inline usage)
  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created': return 'created';
      case 'updated': return 'updated';
      case 'deleted': return 'deleted';
      case 'uploaded': return 'uploaded';
      case 'status_changed': return 'status changed';
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
          {new Date(activity.date).toLocaleDateString('en-US')}
        </p>
        <p className="text-xs text-gray-400">
          {new Date(activity.date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
};

/**
 * Main Dashboard component with real-time data refresh capabilities
 */
export default function Dashboard({ auth }) {
  // ✅ OPTIMIZATIONS: Queries with automatic refetch capabilities
  const {
    data: statsData,
    isLoading: isLoadingStats,
    refetch: refetchStats
  } = useGetDashboardStatsQuery(undefined, {
    refetchOnFocus: true, // Refetch when page regains focus
    refetchOnReconnect: true, // Refetch on network reconnection
  });

  const {
    data: contactsByStatusData,
    isLoading: isLoadingContacts,
    refetch: refetchContacts
  } = useGetContactsByStatusApiQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const {
    data: companiesByStatusData,
    isLoading: isLoadingCompanies,
    refetch: refetchCompanies
  } = useGetCompaniesByStatusApiQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const {
    data: contactsTimelineData,
    isLoading: isLoadingContactsTimeline,
    refetch: refetchContactsTimeline
  } = useGetContactsTimelineApiQuery(6, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const {
    data: documentsTimelineData,
    isLoading: isLoadingDocumentsTimeline,
    refetch: refetchDocumentsTimeline
  } = useGetDocumentsTimelineApiQuery(6, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  // ✅ ACTIVITIES with automatic polling for real-time data
  const {
    data: recentActivitiesData,
    isLoading: isLoadingActivities,
    refetch: refetchActivities
  } = useGetRecentActivitiesApiQuery(8, {
    pollingInterval: 30000, // Poll every 30 seconds
    refetchOnFocus: true,
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: true, // Refetch on component mount
  });

  // Modal state management
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // ✅ Auto-refresh when page becomes visible (active tab)
  const isVisible = useRef(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isVisible.current) {
        // Page becomes visible again, refresh data
        console.log('📱 Page became visible - Refreshing data');

        refetchStats();
        refetchActivities();
        refetchContacts();
        refetchCompanies();
        refetchContactsTimeline();
        refetchDocumentsTimeline();

        isVisible.current = true;
      } else if (document.visibilityState === 'hidden') {
        isVisible.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetchStats, refetchActivities, refetchContacts, refetchCompanies, refetchContactsTimeline, refetchDocumentsTimeline]);

  // ✅ Auto-refresh when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔍 Window became active - Refreshing activities');
      refetchActivities();
    };

    const handleBlur = () => {
      console.log('👻 Window inactive');
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [refetchActivities]);

  // ✅ Initial refresh on component mount
  useEffect(() => {
    console.log('🚀 Dashboard mounted - Initial refresh');
    // Small delay to avoid conflicts with initial queries
    const timer = setTimeout(() => {
      refetchStats();
      refetchActivities();
    }, 100);

    return () => clearTimeout(timer);
  }, []); // Empty dependencies to execute only on mount

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

  // Combine timeline data from contacts and documents
  const combinedTimeline = contactsTimeline.map((item) => {
    const docItem = documentsTimeline.find(d => d.month === item.month);
    return {
      month: item.month,
      contacts: item.contacts || 0,
      documents: docItem?.documents || 0,
    };
  });

  // ✅ Enhanced global refresh handler
  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    refetchStats();
    refetchActivities();
    refetchContacts();
    refetchCompanies();
    refetchContactsTimeline();
    refetchDocumentsTimeline();
    toast.success('Data refreshed!');
  };

  const handleViewActivityDetails = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsActivityModalOpen(true);
  };

  const handleCloseActivityModal = () => {
    setIsActivityModalOpen(false);
    setSelectedActivity(null);
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const response = await fetch('/api/dashboard/export-pdf', {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success('PDF report downloaded successfully!');
      } else {
        throw new Error('Error generating PDF');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error generating PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Custom label renderer for pie charts
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
      header={<h2 className="font-semibold text-xl">Dashboard</h2>}
    >
      <Head title="Dashboard" />

      <div className="py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">Overview</h3>
            <p className="text-gray-500 text-sm">
              Statistics and recent activities
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleRefresh} variant="outline" disabled={isLoadingStats}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleExportPdf}
              variant="default"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={isLoadingStats || isExportingPdf}
            >
              {isExportingPdf ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Contacts"
            value={stats.total_contacts}
            icon={<Users className="h-8 w-8" />}
            trend={stats.contacts_this_month}
            trendLabel="this month"
          />
          <StatsCard
            title="Total Companies"
            value={stats.total_companies}
            icon={<Building className="h-8 w-8" />}
            trend={stats.companies_this_month}
            trendLabel="this month"
          />
          <StatsCard
            title="Total Documents"
            value={stats.total_documents}
            icon={<FileText className="h-8 w-8" />}
          />
          <StatsCard
            title="Total Events"
            value={stats.total_events}
            icon={<Calendar className="h-8 w-8" />}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Contacts by Status Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Distribution</CardTitle>
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
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Companies by Status Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Company Distribution</CardTitle>
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
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Evolution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>6-Month Evolution</CardTitle>
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
                No evolution data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Activities
              {/* ✅ Real-time polling indicator */}
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                Real-time
              </span>
            </CardTitle>
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
                      key={`${activity.type}-${activity.id}-${activity.date}`} // ✅ Unique key with date
                      activity={activity}
                      onViewDetails={handleViewActivityDetails}
                    />
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent activities</p>
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
