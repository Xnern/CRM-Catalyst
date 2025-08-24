import React, { useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar, Target, Users } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface Opportunity {
  id: number;
  name: string;
  amount: number;
  probability: number;
  stage: string;
  expected_close_date: string | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
  };
}

interface Props {
  opportunities: Opportunity[];
  stages: Array<{ value: string; label: string }>;
  auth: any;
}

export default function PipelineStats({ opportunities, stages, auth }: Props) {
  // Calcul des statistiques par étape
  const stageStats = useMemo(() => {
    return stages.map(stage => {
      const stageOpps = opportunities.filter(opp => opp.stage === stage.value);
      const totalAmount = stageOpps.reduce((sum, opp) => sum + (parseFloat(String(opp.amount)) || 0), 0);
      const avgAmount = stageOpps.length > 0 ? totalAmount / stageOpps.length : 0;
      
      return {
        name: stage.label,
        stage: stage.value,
        count: stageOpps.length,
        amount: totalAmount,
        avgAmount: avgAmount,
        percentage: opportunities.length > 0 ? (stageOpps.length / opportunities.length) * 100 : 0
      };
    });
  }, [opportunities, stages]);

  // Calcul du funnel de conversion
  const funnelData = useMemo(() => {
    const orderedStages = ['nouveau', 'qualification', 'proposition_envoyee', 'negociation', 'converti'];
    return orderedStages.map(stageValue => {
      const stage = stageStats.find(s => s.stage === stageValue);
      if (!stage) return null;
      
      return {
        name: stage.name,
        value: stage.count,
        amount: stage.amount,
        fill: stageValue === 'converti' ? '#10b981' : 
              stageValue === 'negociation' ? '#f59e0b' :
              stageValue === 'proposition_envoyee' ? '#8b5cf6' :
              stageValue === 'qualification' ? '#eab308' : '#3b82f6'
      };
    }).filter(Boolean);
  }, [stageStats]);

  // Évolution mensuelle
  const monthlyEvolution = useMemo(() => {
    const monthData: Record<string, { month: string; nouveaux: number; convertis: number; perdus: number; montant: number }> = {};
    
    opportunities.forEach(opp => {
      const date = new Date(opp.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthData[monthKey]) {
        monthData[monthKey] = { 
          month: new Date(date.getFullYear(), date.getMonth()).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
          nouveaux: 0, 
          convertis: 0, 
          perdus: 0,
          montant: 0
        };
      }
      
      if (opp.stage === 'nouveau') monthData[monthKey].nouveaux++;
      if (opp.stage === 'converti') {
        monthData[monthKey].convertis++;
        monthData[monthKey].montant += parseFloat(String(opp.amount)) || 0;
      }
      if (opp.stage === 'perdu') monthData[monthKey].perdus++;
    });
    
    return Object.values(monthData).slice(-6); // Derniers 6 mois
  }, [opportunities]);

  // Performance par utilisateur
  const userPerformance = useMemo(() => {
    const userStats: Record<number, { name: string; opportunities: number; won: number; lost: number; amount: number; conversionRate: number }> = {};
    
    opportunities.forEach(opp => {
      if (!opp.user) return;
      
      if (!userStats[opp.user.id]) {
        userStats[opp.user.id] = {
          name: opp.user.name,
          opportunities: 0,
          won: 0,
          lost: 0,
          amount: 0,
          conversionRate: 0
        };
      }
      
      userStats[opp.user.id].opportunities++;
      if (opp.stage === 'converti') {
        userStats[opp.user.id].won++;
        userStats[opp.user.id].amount += parseFloat(String(opp.amount)) || 0;
      }
      if (opp.stage === 'perdu') {
        userStats[opp.user.id].lost++;
      }
    });
    
    // Calcul du taux de conversion
    Object.values(userStats).forEach(user => {
      const closed = user.won + user.lost;
      user.conversionRate = closed > 0 ? (user.won / closed) * 100 : 0;
    });
    
    return Object.values(userStats).sort((a, b) => b.amount - a.amount);
  }, [opportunities]);

  // Métriques globales
  const globalMetrics = useMemo(() => {
    const totalOpportunities = opportunities.length;
    const totalAmount = opportunities.reduce((sum, opp) => sum + (parseFloat(String(opp.amount)) || 0), 0);
    const wonOpps = opportunities.filter(opp => opp.stage === 'converti');
    const lostOpps = opportunities.filter(opp => opp.stage === 'perdu');
    const avgDealSize = totalOpportunities > 0 ? totalAmount / totalOpportunities : 0;
    const conversionRate = (wonOpps.length + lostOpps.length) > 0 
      ? (wonOpps.length / (wonOpps.length + lostOpps.length)) * 100 
      : 0;
    const wonAmount = wonOpps.reduce((sum, opp) => sum + (parseFloat(String(opp.amount)) || 0), 0);
    
    return {
      totalOpportunities,
      totalAmount,
      wonAmount,
      avgDealSize,
      conversionRate,
      wonDeals: wonOpps.length,
      lostDeals: lostOpps.length
    };
  }, [opportunities]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <AuthenticatedLayout user={auth.user} header={<h2 className="font-semibold text-xl">Statistiques du Pipeline</h2>}>
      <Head title="Statistiques Pipeline" />
      
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <Link href="/kanban">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au Kanban
              </Button>
            </Link>
          </div>

          {/* Métriques principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{formatCurrency(globalMetrics.totalAmount)}</span>
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">{globalMetrics.totalOpportunities} opportunités</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Revenus gagnés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(globalMetrics.wonAmount)}</span>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-xs text-gray-500 mt-1">{globalMetrics.wonDeals} deals convertis</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Taux de conversion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{globalMetrics.conversionRate.toFixed(1)}%</span>
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {globalMetrics.wonDeals} gagnés / {globalMetrics.lostDeals} perdus
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Taille moyenne</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{formatCurrency(globalMetrics.avgDealSize)}</span>
                  <Calendar className="h-5 w-5 text-purple-500" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Par opportunité</p>
              </CardContent>
            </Card>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel de conversion */}
            <Card>
              <CardHeader>
                <CardTitle>Funnel de conversion</CardTitle>
                <CardDescription>Progression des opportunités dans le pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <FunnelChart>
                    <Tooltip formatter={(value) => `${value} opportunités`} />
                    <Funnel
                      dataKey="value"
                      data={funnelData}
                      isAnimationActive
                    >
                      <LabelList position="center" fill="#fff" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Répartition par étape */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition par étape</CardTitle>
                <CardDescription>Distribution des opportunités et montants</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stageStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value: any, name: string) => {
                      if (name === 'Nombre') return value;
                      return formatCurrency(value);
                    }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Nombre" />
                    <Bar yAxisId="right" dataKey="amount" fill="#10b981" name="Montant" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Évolution mensuelle */}
            <Card>
              <CardHeader>
                <CardTitle>Évolution mensuelle</CardTitle>
                <CardDescription>Tendance des opportunités sur les 6 derniers mois</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyEvolution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="nouveaux" stroke="#3b82f6" name="Nouveaux" />
                    <Line type="monotone" dataKey="convertis" stroke="#10b981" name="Convertis" />
                    <Line type="monotone" dataKey="perdus" stroke="#ef4444" name="Perdus" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance par utilisateur */}
            <Card>
              <CardHeader>
                <CardTitle>Performance par commercial</CardTitle>
                <CardDescription>Résultats de l'équipe de vente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userPerformance.slice(0, 5).map((user, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <Users className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-gray-500">
                            {user.opportunities} opps | {user.conversionRate.toFixed(0)}% conversion
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(user.amount)}</p>
                        <p className="text-xs text-gray-500">
                          {user.won} gagnés / {user.lost} perdus
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}