"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MapPin,
  DollarSign,
  Users,
  CloudRain
} from 'lucide-react';
import { healthCheck, riskHealthCheck, impactHealthCheck, simulationHealthCheck } from '@/lib/api';
import USStateMap from './USStateMap';
import TimeSeriesChart from './TimeSeriesChart';
import FilterPanel from './FilterPanel';
import RecentEvents from './RecentEvents';

interface DashboardStats {
  total_events: number;
  total_property_damage: number;
  total_crop_damage: number;
  total_damage: number;
  total_deaths: number;
  total_injuries: number;
  total_casualties: number;
  affected_states: number;
  unique_event_types: number;
  most_common_event: string;
  most_common_event_count: number;
  highest_damage_state: string;
  highest_damage_state_name: string;
  highest_damage_amount: number;
  recent_major_event?: {
    event_type: string;
    state: string;
    date: string;
    damage: number;
    deaths: number;
    injuries: number;
  };
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState<{
    dateFrom?: string;
    dateTo?: string;
    states?: string[];
    eventTypes?: string[];
  }>({});

  const fetchStatistics = useCallback(async () => {
    const controller = new AbortController();
    
    try {
      const params = new URLSearchParams({
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.states?.length && { states: filters.states.join(',') }),
        ...(filters.eventTypes?.length && { eventTypes: filters.eventTypes.join(',') })
      });

      const response = await fetch(`/api/storm-events/statistics?${params}`, {
        signal: controller.signal
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error fetching statistics:', error);
      }
    }
    
    return () => controller.abort();
  }, [filters]);

  const checkSystemHealth = async () => {
    try {
      await Promise.allSettled([
        healthCheck(),
        impactHealthCheck(),
        riskHealthCheck(),
        simulationHealthCheck(),
      ]);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  useEffect(() => {
    checkSystemHealth();
  }, []);

  useEffect(() => {
    const cleanup = fetchStatistics();
    return () => {
      cleanup?.then(fn => fn?.());
    };
  }, [fetchStatistics]);

  const formatDamage = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(0)}`;
  };

  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <FilterPanel onFiltersChange={handleFiltersChange} />
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <CloudRain className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total_events?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {stats?.unique_event_types || 0} event types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Damage</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDamage(stats?.total_damage || 0)}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Property + Crop damage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Casualties</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.total_casualties?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {stats?.total_deaths || 0} deaths, {stats?.total_injuries || 0} injuries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Affected States</CardTitle>
            <MapPin className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.affected_states || 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Highest: {stats?.highest_damage_state || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* US State Map */}
      <div className="w-full">
        <USStateMap 
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          states={filters.states}
          eventTypes={filters.eventTypes}
        />
      </div>

      {/* Time Series Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Property Damage Time Series */}
        <TimeSeriesChart
          title="Property Damage Over Time"
          metric="property_damage"
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          states={filters.states}
          eventTypes={filters.eventTypes}
          height={350}
        />

        {/* Casualties Time Series */}
        <TimeSeriesChart
          title="Casualties Over Time"
          metric="casualties"
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          states={filters.states}
          eventTypes={filters.eventTypes}
          height={350}
        />
      </div>

      {/* Recent Major Events */}
      <RecentEvents 
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        states={filters.states}
        eventTypes={filters.eventTypes}
      />

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Data Summary</CardTitle>
          <CardDescription>
            Based on current filter selection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-600">Most Common Event</p>
              <p className="font-semibold">{stats?.most_common_event || 'N/A'}</p>
              <p className="text-xs text-slate-500">({stats?.most_common_event_count || 0} occurrences)</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Highest Impact State</p>
              <p className="font-semibold">{stats?.highest_damage_state_name || 'N/A'}</p>
              <p className="text-xs text-slate-500">{formatDamage(stats?.highest_damage_amount || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Property Damage</p>
              <p className="font-semibold">{formatDamage(stats?.total_property_damage || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Crop Damage</p>
              <p className="font-semibold">{formatDamage(stats?.total_crop_damage || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 