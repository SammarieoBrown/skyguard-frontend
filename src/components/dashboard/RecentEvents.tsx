"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Calendar, MapPin, DollarSign, Users, Activity, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { getStateName } from '@/lib/state-names';
import { Badge } from '@/components/ui/badge';

interface EventData {
  event_type: string;
  state: string;
  state_name: string;
  date: string;
  damage: {
    property: number;
    crops: number;
    total: number;
  };
  casualties: {
    deaths: {
      direct: number;
      indirect: number;
      total: number;
    };
    injuries: {
      direct: number;
      indirect: number;
      total: number;
    };
    total: number;
  };
  magnitude: number | null;
  severity_class: string;
  impact_score: number;
}

interface RecentEventsProps {
  dateFrom?: string;
  dateTo?: string;
  states?: string[];
  eventTypes?: string[];
}

export default function RecentEvents({
  dateFrom,
  dateTo,
  states,
  eventTypes
}: RecentEventsProps) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventData[]>([]);

  const fetchRecentEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (states?.length) params.append('states', states.join(','));
      if (eventTypes?.length) params.append('eventTypes', eventTypes.join(','));
      params.append('limit', '5');

      const response = await fetch(`/api/storm-events/recent-events?${params}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching recent events:', error);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, states, eventTypes]);

  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      if (mounted) {
        await fetchRecentEvents();
      }
    };
    
    fetchData();
    
    return () => {
      mounted = false;
    };
  }, [fetchRecentEvents]);

  const formatDamage = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Catastrophic': return 'bg-red-900 text-white';
      case 'Extreme': return 'bg-red-700 text-white';
      case 'Severe': return 'bg-orange-600 text-white';
      case 'Major': return 'bg-orange-500 text-white';
      case 'Deadly': return 'bg-red-600 text-white';
      case 'Fatal': return 'bg-red-500 text-white';
      case 'Mass Casualty': return 'bg-purple-600 text-white';
      case 'Multi-Injury': return 'bg-purple-500 text-white';
      default: return 'bg-yellow-500 text-white';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Recent Major Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Top 5 Recent Major Events
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">Most impactful recent storm events</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.length > 0 ? (
            events.map((event, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-base capitalize">
                      {event.event_type?.toLowerCase().replace(/_/g, ' ') || 'Unknown Event'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {getStateName(event.state)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <Badge className={getSeverityColor(event.severity_class)}>
                    {event.severity_class}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                      <DollarSign className="h-3 w-3" />
                      Total Damage
                    </div>
                    <div className="font-semibold text-sm">
                      {formatDamage(event.damage.total)}
                    </div>
                    {event.damage.property > 0 && event.damage.crops > 0 && (
                      <div className="text-xs text-slate-500">
                        Property: {formatDamage(event.damage.property)}
                        {event.damage.crops > 0 && ` | Crops: ${formatDamage(event.damage.crops)}`}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                      <Users className="h-3 w-3" />
                      Deaths
                    </div>
                    <div className="font-semibold text-sm">
                      {event.casualties.deaths.total}
                    </div>
                    {event.casualties.deaths.total > 0 && (
                      <div className="text-xs text-slate-500">
                        Direct: {event.casualties.deaths.direct}
                        {event.casualties.deaths.indirect > 0 && ` | Indirect: ${event.casualties.deaths.indirect}`}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                      <Activity className="h-3 w-3" />
                      Injuries
                    </div>
                    <div className="font-semibold text-sm">
                      {event.casualties.injuries.total}
                    </div>
                    {event.casualties.injuries.total > 0 && (
                      <div className="text-xs text-slate-500">
                        Direct: {event.casualties.injuries.direct}
                        {event.casualties.injuries.indirect > 0 && ` | Indirect: ${event.casualties.injuries.indirect}`}
                      </div>
                    )}
                  </div>
                </div>

                {event.magnitude !== null && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>Magnitude: {event.magnitude.toFixed(1)}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              No significant events found for the selected filters
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}