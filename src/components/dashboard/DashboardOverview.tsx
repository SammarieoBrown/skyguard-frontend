"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Shield, 
  Zap,
  BarChart3,
  MapPin,
  Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { healthCheck, riskHealthCheck, impactHealthCheck, simulationHealthCheck } from '@/lib/api';

// Sample data for visualization - Replace with actual API calls when backend endpoints are available
// TODO: Implement actual data fetching from backend APIs
const recentActivities = [
  { id: 1, type: 'weather', description: 'Weather data updated for Miami region', time: '1 min ago', severity: 'medium' },
  { id: 2, type: 'impact', description: 'Sample: Property damage analysis', time: '5 min ago', severity: 'high' },
  { id: 3, type: 'risk', description: 'Sample: Multi-state risk assessment', time: '15 min ago', severity: 'medium' },
  { id: 4, type: 'simulation', description: 'Sample: Hurricane scenario simulation', time: '1 hour ago', severity: 'high' },
  { id: 5, type: 'forecast', description: 'Weather predictions generated for Seattle region', time: '2 hours ago', severity: 'low' },
];

const riskTrendData = [
  { month: 'Jan', risk: 3.2 },
  { month: 'Feb', risk: 2.8 },
  { month: 'Mar', risk: 4.1 },
  { month: 'Apr', risk: 5.7 },
  { month: 'May', risk: 6.9 },
  { month: 'Jun', risk: 7.2 },
];

const eventTypeData = [
  { name: 'Tornado', value: 35, color: '#ef4444' },
  { name: 'Hurricane', value: 25, color: '#f97316' },
  { name: 'Thunderstorm', value: 20, color: '#eab308' },
  { name: 'Flood', value: 15, color: '#3b82f6' },
  { name: 'Other', value: 5, color: '#6b7280' },
];

const topRiskStates = [
  { state: 'TX', risk: 8.7, events: 247 },
  { state: 'OK', risk: 8.2, events: 198 },
  { state: 'FL', risk: 7.9, events: 156 },
  { state: 'KS', risk: 7.5, events: 134 },
  { state: 'AL', risk: 7.1, events: 112 },
];

export default function DashboardOverview() {
  const [systemStatus, setSystemStatus] = useState({
    api: 'checking',
    impact: 'checking',
    risk: 'checking',
    simulation: 'checking',
  });

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      const [apiHealth, impactHealth, riskHealth, simHealth] = await Promise.allSettled([
        healthCheck(),
        impactHealthCheck(),
        riskHealthCheck(),
        simulationHealthCheck(),
      ]);

      setSystemStatus({
        api: apiHealth.status === 'fulfilled' ? 'online' : 'offline',
        impact: impactHealth.status === 'fulfilled' ? 'online' : 'offline',
        risk: riskHealth.status === 'fulfilled' ? 'online' : 'offline',
        simulation: simHealth.status === 'fulfilled' ? 'online' : 'offline',
      });
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'offline': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'impact': return <Zap className="h-4 w-4 text-blue-600" />;
      case 'risk': return <Shield className="h-4 w-4 text-green-600" />;
      case 'simulation': return <TrendingUp className="h-4 w-4 text-purple-600" />;
      case 'forecast': return <BarChart3 className="h-4 w-4 text-indigo-600" />;
      case 'weather': return <Activity className="h-4 w-4 text-blue-600" />;
      default: return <Activity className="h-4 w-4 text-slate-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Status</CardTitle>
            <Activity className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${systemStatus.api === 'online' ? 'text-green-600' : 'text-red-600'}`}>
              {systemStatus.api === 'online' ? 'Online' : 'Offline'}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Main API endpoint
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impact Models</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${systemStatus.impact === 'online' ? 'text-green-600' : 'text-red-600'}`}>
              {systemStatus.impact === 'online' ? 'Active' : 'Inactive'}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              ML prediction models
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Assessment</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${systemStatus.risk === 'online' ? 'text-green-600' : 'text-red-600'}`}>
              {systemStatus.risk === 'online' ? 'Active' : 'Inactive'}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Risk analysis engine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Simulations</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${systemStatus.simulation === 'online' ? 'text-green-600' : 'text-red-600'}`}>
              {systemStatus.simulation === 'online' ? 'Ready' : 'Offline'}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Scenario modeling
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Risk Trend Analysis
            </CardTitle>
            <CardDescription>
              Sample trend data - Connect to backend for real metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={riskTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="risk" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Event Types
            </CardTitle>
            <CardDescription>
              Sample distribution - Connect to backend for real data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={eventTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {eventTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Risk States */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              High-Risk States
            </CardTitle>
            <CardDescription>
              Sample rankings - Use Risk Assessment tab for real data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topRiskStates.map((state, index) => (
                <div key={state.state} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full text-sm font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{state.state}</div>
                      <div className="text-sm text-slate-600">{state.events} events analyzed</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">{state.risk}</div>
                    <div className="text-sm text-slate-600">Risk Score</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Sample activity - Connect to backend for real events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className={`flex items-start gap-3 p-3 border-l-4 ${getSeverityColor(activity.severity)} bg-slate-50 rounded-r-lg`}>
                  <div className="mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Activity
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 