/**
 * Vue: Dashboard Production (D.1)
 * Route: /dashboard
 * Source SQL: migration 0004_etape_04_dashboard_analytics.sql
 * Source Doc: PLAN_VUES_QHSE.md section D.1 lignes 161-208
 * Tables: audits, reponses, non_conformites
 * Fonctions SQL: 7 fonctions dashboard analytics
 * RLS: Isolation auditeurs (voient leurs audits), admin/manager voient tout
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { DemoBanner } from '@/components/ui/demo-banner';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/loading-states';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/lib/auth-context';
import mockApi from '@/src/data/mockData';
import { supabase } from '@/lib/supabase-client';

export default function DashboardPage() {
  const router = useRouter();
  const { isDemo } = useAuth();
  
  // États
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Données KPIs
  const [auditsCompleted, setAuditsCompleted] = useState(0);
  const [conformityRate, setConformityRate] = useState(0);
  const [auditsByStatus, setAuditsByStatus] = useState(null);
  const [ncByGravity, setNCByGravity] = useState(null);
  const [auditsHistory, setAuditsHistory] = useState([]);
  
  // Filtres
  const [periodFilter, setPeriodFilter] = useState(30); // 30 jours par défaut
  const [depotFilter, setDepotFilter] = useState(null);
  const [depots, setDepots] = useState([]);

  // 🔍 LOG DIAGNOSTIQUE
  useEffect(() => {
    console.log('📊 DASHBOARD render:', {
      isDemo,
      loading,
      hasError: !!error,
      auditsCompleted,
      conformityRate,
      hasStats: !!auditsByStatus
    });
  }, [isDemo, loading, error, auditsCompleted, conformityRate, auditsByStatus]);

  // Couleurs Design System (tokens HSL)
  const CHART_COLORS = {
    planifie: 'hsl(45, 93%, 47%)', // Jaune
    en_cours: 'hsl(217, 91%, 60%)', // Bleu
    termine: 'hsl(142, 71%, 45%)', // Vert
    annule: 'hsl(0, 0%, 45%)', // Gris
    critique: 'hsl(0, 84%, 60%)', // Rouge
    haute: 'hsl(25, 95%, 53%)', // Orange
    moyenne: 'hsl(45, 93%, 47%)', // Jaune
    faible: 'hsl(142, 71%, 45%)', // Vert
    primary: 'hsl(217, 91%, 60%)', // Bleu
  };

  // Chargement données avec useCallback pour éviter warning dépendances
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 DASHBOARD: loadDashboardData, isDemo=', isDemo);

      // ✅ MODE DEMO: utiliser mockApi
      if (isDemo) {
        console.log('📊 DASHBOARD: Mode DEMO → mockApi');
        
        const depotsData = await mockApi.getDepots();
        setDepots(depotsData);

        const [
          completed,
          rate,
          statusData,
          gravityData,
          historyData,
        ] = await Promise.all([
          mockApi.dashboard.getAuditsCompleted(periodFilter),
          mockApi.dashboard.calculateConformityRate(periodFilter),
          mockApi.dashboard.getAuditsByStatus(depotFilter, null, periodFilter),
          mockApi.dashboard.getNCByGravity(depotFilter, periodFilter),
          mockApi.dashboard.getAuditsHistory6Months(),
        ]);

        setAuditsCompleted(completed);
        setConformityRate(rate);
        setAuditsByStatus(statusData);
        setNCByGravity(gravityData);
        setAuditsHistory(historyData);

        return;
      }

      // ✅ MODE PROD: utiliser Supabase (ou valeurs vides si pas implémenté)
      console.log('📊 DASHBOARD: Mode PROD → Supabase');

      if (!supabase) {
        throw new Error('Supabase non configuré');
      }

      // Charger dépôts depuis Supabase
      const { data: depotsData, error: depotsError } = await supabase
        .from('depots')
        .select('*')
        .eq('status', 'active');

      if (depotsError) throw depotsError;
      setDepots(depotsData || []);

      // TODO: Implémenter les fonctions SQL dashboard
      // Pour l'instant, retourner 0 partout (état vide correct)
      console.log('📊 DASHBOARD: Fonctions SQL dashboard pas encore implémentées → valeurs 0');
      
      setAuditsCompleted(0);
      setConformityRate(0);
      setAuditsByStatus({ planifie: 0, en_cours: 0, termine: 0, annule: 0 });
      setNCByGravity({ critique: 0, haute: 0, moyenne: 0, faible: 0 });
      setAuditsHistory([]);

    } catch (err) {
      console.error('❌ DASHBOARD: Erreur chargement:', err);
      setError(err.message || 'Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  }, [isDemo, periodFilter, depotFilter]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Calculs dérivés
  const totalAudits = auditsByStatus 
    ? Object.values(auditsByStatus).reduce((sum, val) => sum + val, 0)
    : 0;

  const totalNC = ncByGravity 
    ? Object.values(ncByGravity).reduce((sum, val) => sum + val, 0)
    : 0;

  const ncCritiques = ncByGravity?.critique || 0;

  // Formatage données pour graphiques
  const auditsPieData = auditsByStatus ? [
    { name: 'Planifiés', value: auditsByStatus.planifie, color: CHART_COLORS.planifie },
    { name: 'En cours', value: auditsByStatus.en_cours, color: CHART_COLORS.en_cours },
    { name: 'Terminés', value: auditsByStatus.termine, color: CHART_COLORS.termine },
    { name: 'Annulés', value: auditsByStatus.annule, color: CHART_COLORS.annule },
  ].filter(d => d.value > 0) : [];

  const ncBarData = ncByGravity ? [
    { name: 'Critique', value: ncByGravity.critique, color: CHART_COLORS.critique },
    { name: 'Haute', value: ncByGravity.haute, color: CHART_COLORS.haute },
    { name: 'Moyenne', value: ncByGravity.moyenne, color: CHART_COLORS.moyenne },
    { name: 'Faible', value: ncByGravity.faible, color: CHART_COLORS.faible },
  ] : [];

  // Handlers filtres
  const handlePeriodChange = (days) => {
    setPeriodFilter(days);
  };

  const handleDepotChange = (e) => {
    const value = e.target.value;
    setDepotFilter(value === 'all' ? null : value);
  };

  // Navigation KPIs cliquables
  const navigateToAudits = (status) => {
    router.push(`/audits${status ? `?status=${status}` : ''}`);
  };

  const navigateToNC = (gravite) => {
    router.push(`/non-conformites${gravite ? `?gravite=${gravite}` : ''}`);
  };

  // États UI
  if (loading) {
    return (
      <AppShell>
        <DemoBanner />
        <div className="container mx-auto px-4 py-8">
          <LoadingState message="Chargement du dashboard..." />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <DemoBanner />
        <div className="container mx-auto px-4 py-8">
          <ErrorState 
            message={error}
            onRetry={loadDashboardData}
          />
        </div>
      </AppShell>
    );
  }

  if (!auditsByStatus && !ncByGravity) {
    return (
      <AppShell>
        <DemoBanner />
        <div className="container mx-auto px-4 py-8">
          <EmptyState 
            message="Aucune donnée disponible"
            description="Créez des audits pour voir les statistiques"
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <DemoBanner />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header avec filtres */}
        <PageHeader
          title="Dashboard Production"
          description="Vue synthèse temps réel des audits et non-conformités"
        />

        {/* Filtres */}
        <Card className="mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Filtre période */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[hsl(var(--text))]">Période:</span>
              <div className="flex gap-1">
                {[
                  { label: '7j', value: 7 },
                  { label: '30j', value: 30 },
                  { label: '90j', value: 90 },
                  { label: '6m', value: 180 },
                  { label: '12m', value: 365 },
                ].map(period => (
                  <Button
                    key={period.value}
                    variant={periodFilter === period.value ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => handlePeriodChange(period.value)}
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filtre dépôt */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[hsl(var(--text))]">Dépôt:</span>
              <select
                value={depotFilter || 'all'}
                onChange={handleDepotChange}
                className="px-3 py-1.5 text-sm border border-[hsl(var(--border))] rounded-md bg-[hsl(var(--background))] text-[hsl(var(--text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              >
                <option value="all">Tous les dépôts</option>
                {depots.map(depot => (
                  <option key={depot.id} value={depot.id}>
                    {depot.code} - {depot.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* KPIs - 6 cartes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* KPI 1: Audits terminés */}
          <Card 
            className="cursor-pointer hover:border-[hsl(var(--primary))] transition-colors"
            onClick={() => navigateToAudits('termine')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--text-muted))]">Audits terminés</p>
                <p className="text-3xl font-bold text-[hsl(var(--text))] mt-2">{auditsCompleted}</p>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  {periodFilter} derniers jours
                </p>
              </div>
              <div className="p-3 bg-[hsl(var(--success)/0.1)] rounded-lg">
                <CheckCircle className="h-6 w-6 text-[hsl(var(--success))]" />
              </div>
            </div>
          </Card>

          {/* KPI 2: Taux de conformité */}
          <Card 
            className="cursor-pointer hover:border-[hsl(var(--primary))] transition-colors"
            onClick={() => navigateToAudits()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--text-muted))]">Taux de conformité</p>
                <p className="text-3xl font-bold text-[hsl(var(--success))] mt-2">{conformityRate}%</p>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  Conformité globale
                </p>
              </div>
              <div className="p-3 bg-[hsl(var(--success)/0.1)] rounded-lg">
                <TrendingUp className="h-6 w-6 text-[hsl(var(--success))]" />
              </div>
            </div>
          </Card>

          {/* KPI 3: Audits planifiés */}
          <Card 
            className="cursor-pointer hover:border-[hsl(var(--primary))] transition-colors"
            onClick={() => navigateToAudits('planifie')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--text-muted))]">Audits à faire</p>
                <p className="text-3xl font-bold text-[hsl(var(--warning))] mt-2">{auditsByStatus?.planifie || 0}</p>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  Planifiés
                </p>
              </div>
              <div className="p-3 bg-[hsl(var(--warning)/0.1)] rounded-lg">
                <Clock className="h-6 w-6 text-[hsl(var(--warning))]" />
              </div>
            </div>
          </Card>

          {/* KPI 4: Audits en cours */}
          <Card 
            className="cursor-pointer hover:border-[hsl(var(--primary))] transition-colors"
            onClick={() => navigateToAudits('en_cours')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--text-muted))]">Audits en cours</p>
                <p className="text-3xl font-bold text-[hsl(var(--primary))] mt-2">{auditsByStatus?.en_cours || 0}</p>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  En progression
                </p>
              </div>
              <div className="p-3 bg-[hsl(var(--primary)/0.1)] rounded-lg">
                <BarChart3 className="h-6 w-6 text-[hsl(var(--primary))]" />
              </div>
            </div>
          </Card>

          {/* KPI 5: NC ouvertes */}
          <Card 
            className="cursor-pointer hover:border-[hsl(var(--primary))] transition-colors"
            onClick={() => navigateToNC()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--text-muted))]">NC ouvertes</p>
                <p className="text-3xl font-bold text-[hsl(var(--text))] mt-2">{totalNC}</p>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  Toutes gravités
                </p>
              </div>
              <div className="p-3 bg-[hsl(var(--destructive)/0.1)] rounded-lg">
                <AlertTriangle className="h-6 w-6 text-[hsl(var(--destructive))]" />
              </div>
            </div>
          </Card>

          {/* KPI 6: NC critiques */}
          <Card 
            className="cursor-pointer hover:border-[hsl(var(--primary))] transition-colors"
            onClick={() => navigateToNC('critique')}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[hsl(var(--text-muted))]">NC critiques</p>
                <p className="text-3xl font-bold text-[hsl(var(--destructive))] mt-2">{ncCritiques}</p>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  Action immédiate requise
                </p>
              </div>
              <div className="p-3 bg-[hsl(var(--destructive)/0.1)] rounded-lg">
                <XCircle className="h-6 w-6 text-[hsl(var(--destructive))]" />
              </div>
            </div>
          </Card>
        </div>

        {/* Graphiques - 3 charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graphique 1: Donut - Répartition audits par statut */}
          <Card>
            <h3 className="text-lg font-semibold text-[hsl(var(--text))] mb-4">
              Répartition des audits par statut
            </h3>
            
            {auditsPieData.length === 0 ? (
              <EmptyState 
                message="Aucun audit"
                description="Créez des audits pour voir la répartition"
              />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={auditsPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {auditsPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Graphique 2: Bar - NC par gravité */}
          <Card>
            <h3 className="text-lg font-semibold text-[hsl(var(--text))] mb-4">
              Non-conformités par gravité
            </h3>
            
            {totalNC === 0 ? (
              <EmptyState 
                message="Aucune NC"
                description="Les non-conformités apparaîtront ici"
              />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ncBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--text-muted))"
                    tick={{ fill: 'hsl(var(--text-muted))' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--text-muted))"
                    tick={{ fill: 'hsl(var(--text-muted))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {ncBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Graphique 3: Line - Historique 6 mois audits terminés */}
          <Card className="lg:col-span-2">
            <h3 className="text-lg font-semibold text-[hsl(var(--text))] mb-4">
              Historique des audits terminés (6 derniers mois)
            </h3>
            
            {auditsHistory.length === 0 ? (
              <EmptyState 
                message="Aucun historique"
                description="Les données d'historique apparaîtront ici"
              />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={auditsHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--text-muted))"
                    tick={{ fill: 'hsl(var(--text-muted))' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--text-muted))"
                    tick={{ fill: 'hsl(var(--text-muted))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    name="Audits terminés"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.primary, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
