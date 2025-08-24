import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Activity, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { router } from '@inertiajs/react';

interface ForecastProps {
  forecasts: {
    monthly: Array<{
      month: string;
      month_label: string;
      committed: number;
      best_case: number;
      pipeline: number;
      weighted: number;
      total: number;
      opportunities_count: number;
    }>;
    totals: {
      committed: number;
      best_case: number;
      pipeline: number;
      weighted: number;
      total: number;
      opportunities_count: number;
    };
    period_label: string;
  };
  historicalData: Array<{
    month: string;
    month_label: string;
    count: number;
    total: number;
    average: number;
  }>;
  pipelineAnalysis: Array<{
    stage: string;
    label: string;
    probability: number;
    count: number;
    total_value: number;
    weighted_value: number;
    average_value: number;
    average_days_in_stage: number;
  }>;
  conversionRates: {
    stage_rates: Array<{
      from_stage: string;
      to_stage: string;
      from_label: string;
      to_label: string;
      rate: number;
      progressed: number;
      total: number;
    }>;
    overall_rate: number;
    total_opportunities: number;
    won_opportunities: number;
  };
  filters: {
    period: string;
    scenario: string;
  };
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ForecastIndex({ forecasts, historicalData, pipelineAnalysis, conversionRates, filters }: ForecastProps) {
  const [period, setPeriod] = useState(filters.period);
  const [scenario, setScenario] = useState(filters.scenario);
  
  // S'assurer que les valeurs sont numériques
  const pipelineData = pipelineAnalysis.map(item => ({
    ...item,
    total_value: Number(item.total_value) || 0,
    weighted_value: Number(item.weighted_value) || 0,
    average_value: Number(item.average_value) || 0,
  }));
  
  // S'assurer que les données historiques sont numériques
  const historicalDataFormatted = historicalData.map(item => ({
    ...item,
    total: Number(item.total) || 0,
    average: Number(item.average) || 0,
    count: Number(item.count) || 0,
  }));

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    router.get('/previsions', { period: value, scenario }, { preserveState: true });
  };

  const handleScenarioChange = (value: string) => {
    setScenario(value);
    router.get('/previsions', { period, scenario: value }, { preserveState: true });
  };

  // Préparer les données pour le graphique combiné
  const combinedData = forecasts.monthly.map(month => {
    const historical = historicalDataFormatted.find(h => h.month === month.month);
    return {
      ...month,
      historical: historical?.total || 0,
    };
  });

  // Calculer la tendance
  const trend = historicalDataFormatted.length >= 2 
    ? ((historicalDataFormatted[historicalDataFormatted.length - 1].total - historicalDataFormatted[0].total) / historicalDataFormatted[0].total) * 100
    : 0;

  return (
    <AuthenticatedLayout header={
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
          Prévisions de Revenus
        </h2>
        <div className="flex gap-4">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="semester">Semestre</SelectItem>
              <SelectItem value="year">Année</SelectItem>
            </SelectContent>
          </Select>
          <Select value={scenario} onValueChange={handleScenarioChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pessimistic">Pessimiste</SelectItem>
              <SelectItem value="realistic">Réaliste</SelectItem>
              <SelectItem value="optimistic">Optimiste</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    }>
      <Head title="Prévisions" />

      <div className="py-12">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
          
          {/* Métriques clés */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenu Engagé</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(forecasts.totals.committed)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Probabilité &gt; 75%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Meilleur Cas</CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(forecasts.totals.best_case)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Probabilité 50-75%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
                <Activity className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(forecasts.totals.pipeline)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Probabilité &lt; 50%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenu Pondéré</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(forecasts.totals.weighted)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Basé sur les probabilités
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Graphique de prévisions mensuelles */}
          <Card>
            <CardHeader>
              <CardTitle>Prévisions par Mois - {forecasts.period_label}</CardTitle>
              <CardDescription>
                Scénario {scenario === 'pessimistic' ? 'pessimiste' : scenario === 'optimistic' ? 'optimiste' : 'réaliste'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month_label" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
                    wrapperStyle={{ zIndex: 10 }}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  />
                  <Legend />
                  <Bar dataKey="committed" stackId="a" fill="#10b981" name="Engagé" />
                  <Bar dataKey="best_case" stackId="a" fill="#3b82f6" name="Meilleur cas" />
                  <Bar dataKey="pipeline" stackId="a" fill="#f59e0b" name="Pipeline" />
                  <Line type="monotone" dataKey="weighted" stroke="#8b5cf6" name="Pondéré" strokeWidth={2} />
                  {historicalData.length > 0 && (
                    <Line type="monotone" dataKey="historical" stroke="#6b7280" name="Historique" strokeDasharray="5 5" />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Analyse du Pipeline */}
            <Card>
              <CardHeader>
                <CardTitle>Analyse du Pipeline</CardTitle>
                <CardDescription>Répartition par étape</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Debug: Afficher les données */}
                {pipelineData.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    Aucune donnée disponible pour l'analyse du pipeline
                  </div>
                )}
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={pipelineData} 
                    margin={{ left: 30, right: 30, top: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                      wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    />
                    <Legend />
                    <Bar dataKey="total_value" fill="#3b82f6" name="Valeur totale" opacity={0.9} />
                    <Bar dataKey="weighted_value" fill="#10b981" name="Valeur pondérée" opacity={0.9} />
                  </BarChart>
                </ResponsiveContainer>
                
                <div className="mt-4 space-y-2">
                  {pipelineData.map(stage => (
                    <div key={stage.stage} className="flex justify-between text-sm">
                      <span className="text-gray-600">{stage.label}</span>
                      <div className="flex gap-4">
                        <span>{stage.count} opp.</span>
                        <span className="font-medium">{stage.probability}%</span>
                        <span className="text-gray-500">~{stage.average_days_in_stage}j</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Taux de conversion */}
            <Card>
              <CardHeader>
                <CardTitle>Taux de Conversion</CardTitle>
                <CardDescription>Sur les 3 derniers mois</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold">{conversionRates.overall_rate}%</span>
                    <span className="text-sm text-gray-600">
                      {conversionRates.won_opportunities} / {conversionRates.total_opportunities}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${conversionRates.overall_rate}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {conversionRates.stage_rates.map((rate, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {rate.from_label} → {rate.to_label}
                        </span>
                        <span className="font-medium">{rate.rate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${rate.rate}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{rate.progressed} progressées</span>
                        <span>sur {rate.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Historique des ventes */}
          {historicalDataFormatted.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historique des Ventes</CardTitle>
                <CardDescription>
                  6 derniers mois - Tendance: {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                  {trend > 0 ? (
                    <TrendingUp className="inline ml-2 h-4 w-4 text-green-600" />
                  ) : trend < 0 ? (
                    <TrendingDown className="inline ml-2 h-4 w-4 text-red-600" />
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historicalDataFormatted.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    Aucune donnée historique disponible
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={historicalDataFormatted}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month_label" />
                    <YAxis />
                    <Tooltip 
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
                    wrapperStyle={{ zIndex: 10 }}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.6}
                      name="Revenu réalisé"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="average" 
                      stroke="#3b82f6" 
                      name="Ticket moyen"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}