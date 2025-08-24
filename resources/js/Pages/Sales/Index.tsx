import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target, 
  Calendar,
  AlertCircle,
  Plus,
  Filter,
  ChevronRight,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Input } from '@/Components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/Components/ui/pagination';

interface Opportunity {
  id: number;
  name: string;
  amount: number;
  probability: number;
  stage: string;
  stage_label: string;
  expected_close_date: string;
  days_until_close: number | null;
  is_overdue: boolean;
  contact: {
    id: number;
    name: string;
    email: string;
  };
  company: {
    id: number;
    name: string;
  } | null;
  user: {
    id: number;
    name: string;
  };
}

interface Metrics {
  pipeline_value: number;
  weighted_pipeline: number;
  opportunities_count: number;
  won_this_month: number;
  conversion_rate: number;
  average_deal_size: number;
  closing_this_month: number;
  overdue_opportunities: number;
  by_stage: Array<{
    stage: string;
    stage_label: string;
    count: number;
    total: number;
  }>;
  forecast: Array<{
    month: string;
    expected: number;
  }>;
}

interface Props {
  opportunities: {
    data: Opportunity[];
    current_page: number;
    last_page: number;
    total: number;
  };
  metrics: Metrics;
  stages: Array<{ value: string; label: string }>;
  filters: {
    stage: string | null;
    user_id: string | null;
    company_id: string | null;
    search: string | null;
  };
}

export default function SalesIndex({ opportunities, metrics, stages, filters }: Props) {
  const [selectedStage, setSelectedStage] = useState(filters.stage);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  const handleFilterChange = (type: string, value: string | null) => {
    const newFilters: any = { ...filters };
    newFilters[type] = value;
    
    router.get('/opportunites', newFilters, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const handlePageChange = (page: number) => {
    router.get(`/opportunites?page=${page}`, filters, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'nouveau':
        return 'bg-blue-100 text-blue-800';
      case 'qualification':
        return 'bg-yellow-100 text-yellow-800';
      case 'proposition_envoyee':
        return 'bg-purple-100 text-purple-800';
      case 'negociation':
        return 'bg-orange-100 text-orange-800';
      case 'converti':
        return 'bg-green-100 text-green-800';
      case 'perdu':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 75) return 'text-green-600';
    if (probability >= 50) return 'text-yellow-600';
    if (probability >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <AuthenticatedLayout
      header={
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold leading-tight text-gray-800">
            Pipeline de Ventes
          </h2>
          <Link href="/opportunites/create">
            <Button className="bg-primary-600 hover:bg-primary-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Opportunité
            </Button>
          </Link>
        </div>
      }
    >
      <Head title="Pipeline de Ventes" />

      <div className="py-12">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
          
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Valeur Pipeline
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics.pipeline_value)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.opportunities_count} opportunités
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pipeline Pondéré
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics.weighted_pipeline)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Basé sur les probabilités
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Gagné ce mois
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics.won_this_month)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Taux de conversion: {metrics.conversion_rate}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Taille moyenne
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics.average_deal_size)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Par opportunité gagnée
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline by Stage */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline par Étape</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics.by_stage.map((stage) => (
                  <div 
                    key={stage.stage}
                    className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedStage(stage.stage)}
                  >
                    <div className="text-2xl font-bold">{stage.count}</div>
                    <div className="text-sm text-gray-600">{stage.stage_label}</div>
                    <div className="text-sm font-semibold mt-1">
                      {formatCurrency(stage.total)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          {metrics.overdue_opportunities > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="flex items-center gap-2 pt-6">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span className="text-orange-800">
                  {metrics.overdue_opportunities} opportunité(s) en retard
                </span>
              </CardContent>
            </Card>
          )}

          {/* Opportunities List */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Toutes les Opportunités ({opportunities.total})</CardTitle>
                <div className="flex gap-2">
                  <Select
                    value={filters.stage || 'all'}
                    onValueChange={(value) => handleFilterChange('stage', value === 'all' ? null : value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrer par étape" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les étapes</SelectItem>
                      {stages.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="search"
                    placeholder="Rechercher..."
                    className="w-[200px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        router.get('/opportunites', { ...filters, search: searchTerm }, {
                          preserveState: true,
                          preserveScroll: true,
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {opportunities.data.map((opportunity) => (
                  <Link
                    key={opportunity.id}
                    href={`/opportunites/${opportunity.id}`}
                    className="block"
                  >
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {opportunity.name}
                            </h3>
                            <Badge className={getStageColor(opportunity.stage)}>
                              {opportunity.stage_label}
                            </Badge>
                            {opportunity.is_overdue && (
                              <Badge variant="destructive">En retard</Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {opportunity.contact.name}
                            </span>
                            {opportunity.company && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {opportunity.company.name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {opportunity.expected_close_date ? 
                                new Date(opportunity.expected_close_date).toLocaleDateString('fr-FR') : 
                                'Date non définie'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right space-y-1">
                          <div className="text-lg font-bold">
                            {formatCurrency(opportunity.amount)}
                          </div>
                          <div className={`text-sm font-medium ${getProbabilityColor(opportunity.probability)}`}>
                            {opportunity.probability}% de probabilité
                          </div>
                          <div className="text-xs text-gray-500">
                            Pondéré: {formatCurrency(opportunity.amount * opportunity.probability / 100)}
                          </div>
                        </div>
                      </div>
                      
                      {opportunity.days_until_close !== null && (
                        <div className="mt-2 text-xs text-gray-500">
                          {opportunity.days_until_close > 0 
                            ? `${opportunity.days_until_close} jours restants`
                            : opportunity.days_until_close === 0
                            ? "Clôture aujourd'hui"
                            : `${Math.abs(opportunity.days_until_close)} jours de retard`}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              
              {opportunities.data.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Aucune opportunité trouvée
                </div>
              )}
              
              {/* Pagination */}
              {opportunities.last_page > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(opportunities.current_page - 1)}
                          className={opportunities.current_page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {[...Array(opportunities.last_page)].map((_, index) => {
                        const page = index + 1;
                        if (
                          page === 1 ||
                          page === opportunities.last_page ||
                          (page >= opportunities.current_page - 1 && page <= opportunities.current_page + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => handlePageChange(page)}
                                isActive={page === opportunities.current_page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (
                          page === opportunities.current_page - 2 ||
                          page === opportunities.current_page + 2
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(opportunities.current_page + 1)}
                          className={opportunities.current_page === opportunities.last_page ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Forecast */}
          <Card>
            <CardHeader>
              <CardTitle>Prévisions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {metrics.forecast.map((month) => (
                  <div key={month.month} className="text-center p-4 border rounded-lg">
                    <div className="text-sm text-gray-600">{month.month}</div>
                    <div className="text-xl font-bold mt-2">
                      {formatCurrency(month.expected)}
                    </div>
                    <div className="text-xs text-gray-500">Attendu</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </AuthenticatedLayout>
  );
}