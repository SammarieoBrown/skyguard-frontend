"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  BarChart3, 
  Shield, 
  Zap, 
  TrendingUp, 
  MapPin,
  AlertTriangle,
  Menu,
  X,
  Home,
  ChevronRight,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import ImpactAnalysis from '@/components/dashboard/ImpactAnalysis';
import RiskAssessment from '@/components/dashboard/RiskAssessment';
import ScenarioSimulation from '@/components/dashboard/ScenarioSimulation';
import DashboardOverview from '@/components/dashboard/DashboardOverview';

const navigationItems = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'impact', label: 'Impact Analysis', icon: Zap },
  { id: 'risk', label: 'Risk Assessment', icon: Shield },
  { id: 'simulation', label: 'Scenario Simulation', icon: TrendingUp },
];

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Get active section from URL, default to 'overview'
  const activeSection = searchParams.get('section') || 'overview';
  
  // Update URL when section changes
  const setActiveSection = (section: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('section', section);
    router.push(`/dashboard?${params.toString()}`);
  };
  
  // Redirect to overview if no section is specified
  useEffect(() => {
    if (!searchParams.get('section')) {
      router.replace('/dashboard?section=overview');
    }
  }, [searchParams, router]);

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <DashboardOverview />;
      case 'impact':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Zap className="h-6 w-6 text-slate-700" />
                Impact Analysis
              </CardTitle>
              <CardDescription>
                Predict property damage, casualty risk, and event severity using AI models trained on 75 years of weather data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImpactAnalysis />
            </CardContent>
          </Card>
        );
      case 'risk':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-slate-700" />
                Risk Assessment
              </CardTitle>
              <CardDescription>
                Analyze regional risk levels, compare states, and understand event-specific threats.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RiskAssessment />
            </CardContent>
          </Card>
        );
      case 'simulation':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-slate-700" />
                Scenario Simulation
              </CardTitle>
              <CardDescription>
                Run "what-if" scenarios to understand how changing event parameters affects outcomes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScenarioSimulation />
            </CardContent>
          </Card>
        );
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-slate-700 mr-3" />
            <span className="text-lg font-semibold text-slate-900">SkyGuard</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link 
            href="/"
            className="flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Home className="h-4 w-4 mr-3" />
            Back to Home
          </Link>

          <div className="pt-4">
            <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Analytics
            </h3>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center px-3 py-2 bg-green-50 text-green-800 rounded-lg">
            <Activity className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">System Online</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden mr-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {navigationItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  AI-powered severe weather prediction and risk analysis
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
} 