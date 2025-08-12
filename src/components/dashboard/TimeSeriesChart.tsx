"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Area, 
  Bar, 
  CartesianGrid, 
  Legend, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  ComposedChart,
  Line
} from 'recharts';

interface TimeSeriesData {
  period: string;
  value: number;
  event_count: number;
  states_affected: number;
  event_types: number;
}

interface TimeSeriesChartProps {
  title?: string;
  metric?: string;
  dateFrom?: string;
  dateTo?: string;
  states?: string[];
  eventTypes?: string[];
  height?: number;
}

const metricOptions = [
  { label: 'Total Damage', value: 'damage' },
  { label: 'Property Damage', value: 'property_damage' },
  { label: 'Crop Damage', value: 'crop_damage' },
  { label: 'Total Casualties', value: 'casualties' },
  { label: 'Deaths', value: 'deaths' },
  { label: 'Injuries', value: 'injuries' },
  { label: 'Event Count', value: 'events' }
];

const groupByOptions = [
  { label: 'Daily', value: 'day' },
  { label: 'Weekly', value: 'week' },
  { label: 'Monthly', value: 'month' },
  { label: 'Yearly', value: 'year' }
];

export default function TimeSeriesChart({ 
  title = "Time Series Analysis",
  metric: initialMetric = 'damage',
  dateFrom, 
  dateTo, 
  states, 
  eventTypes,
  height = 400 
}: TimeSeriesChartProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TimeSeriesData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState(initialMetric);
  const [groupBy, setGroupBy] = useState('month');
  const [showMovingAverage, setShowMovingAverage] = useState(false);
  const [stats, setStats] = useState<{
    min: number;
    max: number;
    avg: number;
    total: number;
    dataPoints: number;
  } | null>(null);

  const fetchTimeSeriesData = useCallback(async (metric?: string, groupByValue?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        metric: metric || selectedMetric,
        groupBy: groupByValue || groupBy,
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(states?.length && { states: states.join(',') }),
        ...(eventTypes?.length && { eventTypes: eventTypes.join(',') })
      });

      const response = await fetch(`/api/storm-events/time-series?${params}`);
      const result = await response.json();
      
      if (result.data) {
        setData(result.data);
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error fetching time series data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMetric, groupBy, dateFrom, dateTo, states, eventTypes]);

  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      if (mounted) {
        await fetchTimeSeriesData();
      }
    };
    
    fetchData();
    
    return () => {
      mounted = false;
    };
  }, [fetchTimeSeriesData]);

  const formatValue = (value: number) => {
    if (selectedMetric.includes('damage')) {
      if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
      if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
      return `$${value.toFixed(0)}`;
    }
    return value.toLocaleString();
  };

  const formatXAxis = (tickItem: string) => {
    if (groupBy === 'year') return tickItem;
    if (groupBy === 'month') {
      const [year, month] = tickItem.split('-');
      return `${month}/${year.slice(2)}`;
    }
    if (groupBy === 'week' || groupBy === 'day') {
      const date = new Date(tickItem);
      return `${(date.getMonth() + 1)}/${date.getDate()}`;
    }
    return tickItem;
  };

  const calculateMovingAverage = (data: TimeSeriesData[], window: number = 3) => {
    return data.map((item, index) => {
      const start = Math.max(0, index - Math.floor(window / 2));
      const end = Math.min(data.length, index + Math.floor(window / 2) + 1);
      const subset = data.slice(start, end);
      const avg = subset.reduce((a, b) => a + b.value, 0) / subset.length;
      return { ...item, movingAverage: avg };
    });
  };

  const chartData = showMovingAverage ? calculateMovingAverage(data) : data;

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'Event Count' ? entry.value : formatValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Select 
              value={selectedMetric} 
              onValueChange={(value) => {
                setSelectedMetric(value);
                fetchTimeSeriesData(value, groupBy);
              }}
            >
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {metricOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={groupBy} 
              onValueChange={(value) => {
                setGroupBy(value);
                fetchTimeSeriesData(selectedMetric, value);
              }}
            >
              <SelectTrigger className="w-28 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupByOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showMovingAverage ? "default" : "outline"}
              size="sm"
              onClick={() => setShowMovingAverage(!showMovingAverage)}
            >
              MA
            </Button>
          </div>
        </div>
        {stats && (
          <div className="flex gap-6 mt-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Total:</span>
              <span className="font-semibold text-slate-900">{formatValue(stats.total)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Average:</span>
              <span className="font-semibold text-slate-900">{formatValue(stats.avg)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Max:</span>
              <span className="font-semibold text-slate-900">{formatValue(stats.max)}</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis 
                dataKey="period" 
                tickFormatter={formatXAxis}
                angle={-45}
                textAnchor="end"
                height={60}
                className="text-xs"
                tick={{ fill: '#64748b' }}
              />
              <YAxis 
                yAxisId="left"
                tickFormatter={formatValue}
                className="text-xs"
                tick={{ fill: '#64748b' }}
                label={{ 
                  value: metricOptions.find(m => m.value === selectedMetric)?.label, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: '#64748b', fontSize: 12 }
                }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                className="text-xs"
                tick={{ fill: '#64748b' }}
                label={{ 
                  value: 'Event Count', 
                  angle: 90, 
                  position: 'insideRight',
                  style: { fill: '#64748b', fontSize: 12 }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={0.6}
                fill="url(#colorValue)"
                name={metricOptions.find(m => m.value === selectedMetric)?.label}
              />
              <Bar 
                yAxisId="right"
                dataKey="event_count" 
                fill="#fbbf24"
                fillOpacity={0.7}
                name="Event Count"
              />
              {showMovingAverage && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="movingAverage"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Moving Average"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
            <p className="text-slate-500">No data available for the selected filters</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}