"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Cloud, RefreshCw, X } from 'lucide-react';
import { format, subDays, subYears } from 'date-fns';
import { getStateName } from '@/lib/state-names';

interface FilterOptions {
  states: { code: string; name: string }[];
  event_types: { name: string; count: number }[];
  date_range: { min: string; max: string };
  date_presets: { label: string; value: string }[];
}

interface FilterPanelProps {
  onFiltersChange: (filters: {
    dateFrom?: string;
    dateTo?: string;
    states?: string[];
    eventTypes?: string[];
  }) => void;
}

export default function FilterPanel({ onFiltersChange }: FilterPanelProps) {
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  
  // Filter states
  const [datePreset, setDatePreset] = useState('10y');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [customDateMode, setCustomDateMode] = useState(false);

  const fetchFilterOptions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/storm-events/filters');
      const data = await response.json();
      setFilterOptions(data);
      return data;
    } catch (error) {
      console.error('Error fetching filter options:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const applyDatePreset = useCallback((preset: string) => {
    // Use the max date from the database if available, otherwise use today
    const maxDate = filterOptions?.date_range?.max ? new Date(filterOptions.date_range.max) : new Date();
    let from: Date;
    
    switch (preset) {
      case '7d':
        from = subDays(maxDate, 7);
        break;
      case '30d':
        from = subDays(maxDate, 30);
        break;
      case '90d':
        from = subDays(maxDate, 90);
        break;
      case '1y':
        from = subYears(maxDate, 1);
        break;
      case '5y':
        from = subYears(maxDate, 5);
        break;
      case '10y':
        from = subYears(maxDate, 10);
        break;
      case 'all':
        setDateFrom('');
        setDateTo('');
        return;
      default:
        from = subYears(maxDate, 10);
    }
    
    setDateFrom(format(from, 'yyyy-MM-dd'));
    setDateTo(format(maxDate, 'yyyy-MM-dd'));
  }, [filterOptions]);

  useEffect(() => {
    let mounted = true;
    
    fetchFilterOptions().then((data) => {
      if (mounted && data) {
        // Set initial date range to last 10 years using the fetched data
        const maxDate = data.date_range?.max ? new Date(data.date_range.max) : new Date();
        const from = subYears(maxDate, 10);
        setDateFrom(format(from, 'yyyy-MM-dd'));
        setDateTo(format(maxDate, 'yyyy-MM-dd'));
      }
    });
    
    return () => {
      mounted = false;
    };
  }, [fetchFilterOptions]);

  useEffect(() => {
    if (!customDateMode && filterOptions) {
      applyDatePreset(datePreset);
    }
  }, [datePreset, customDateMode, filterOptions, applyDatePreset]);

  useEffect(() => {
    // Notify parent of filter changes
    onFiltersChange({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      states: selectedStates.length > 0 ? selectedStates : undefined,
      eventTypes: selectedEventTypes.length > 0 ? selectedEventTypes : undefined
    });
  }, [dateFrom, dateTo, selectedStates, selectedEventTypes, onFiltersChange]);

  const handleStateChange = (state: string) => {
    setSelectedStates(prev => {
      if (state === 'all') return [];
      if (prev.includes(state)) {
        return prev.filter(s => s !== state);
      }
      return [...prev, state];
    });
  };

  const handleEventTypeChange = (eventType: string) => {
    setSelectedEventTypes(prev => {
      if (eventType === 'all') return [];
      if (prev.includes(eventType)) {
        return prev.filter(e => e !== eventType);
      }
      return [...prev, eventType];
    });
  };

  const resetFilters = () => {
    setDatePreset('30d');
    setCustomDateMode(false);
    setSelectedStates([]);
    setSelectedEventTypes([]);
    applyDatePreset('30d');
  };

  if (loading || !filterOptions) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-8 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex flex-wrap items-end gap-4">
        {/* Date Range Filter */}
        <div className="flex-1 min-w-[200px]">
          <Label className="flex items-center gap-1 mb-2">
            <Calendar className="h-3 w-3" />
            Date Range
          </Label>
          {!customDateMode ? (
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions?.date_presets?.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                )) || []}
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm"
                max={filterOptions?.date_range?.max || ''}
                min={filterOptions?.date_range?.min || ''}
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm"
                max={filterOptions?.date_range?.max || ''}
                min={filterOptions?.date_range?.min || ''}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCustomDateMode(false);
                  setDatePreset('30d');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          {datePreset === 'custom' && !customDateMode && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => setCustomDateMode(true)}
            >
              Set Custom Range
            </Button>
          )}
        </div>

        {/* State Filter */}
        <div className="flex-1 min-w-[200px]">
          <Label className="flex items-center gap-1 mb-2">
            <MapPin className="h-3 w-3" />
            States ({selectedStates.length || 'All'})
          </Label>
          <Select
            value={selectedStates.length === 0 ? 'all' : selectedStates[0]}
            onValueChange={handleStateChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All States">
                {selectedStates.length === 0 
                  ? 'All States' 
                  : selectedStates.length === 1 
                    ? getStateName(selectedStates[0])
                    : `${selectedStates.length} states`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {filterOptions?.states?.map(state => (
                <SelectItem key={state.code} value={state.code}>
                  <div className="flex items-center gap-2">
                    {selectedStates.includes(state.code) && (
                      <span className="text-green-600">✓</span>
                    )}
                    {getStateName(state.name || state.code)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedStates.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedStates.map(state => (
                <span
                  key={state}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {getStateName(state)}
                  <button
                    onClick={() => handleStateChange(state)}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Event Type Filter */}
        <div className="flex-1 min-w-[200px]">
          <Label className="flex items-center gap-1 mb-2">
            <Cloud className="h-3 w-3" />
            Event Types ({selectedEventTypes.length || 'All'})
          </Label>
          <Select
            value={selectedEventTypes.length === 0 ? 'all' : selectedEventTypes[0]}
            onValueChange={handleEventTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Event Types">
                {selectedEventTypes.length === 0 
                  ? 'All Event Types' 
                  : selectedEventTypes.length === 1 
                    ? selectedEventTypes[0]
                    : `${selectedEventTypes.length} types`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Event Types</SelectItem>
              {filterOptions?.event_types?.map(eventType => (
                <SelectItem key={eventType.name} value={eventType.name}>
                  <div className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-2">
                      {selectedEventTypes.includes(eventType.name) && (
                        <span className="text-green-600">✓</span>
                      )}
                      {eventType.name}
                    </span>
                    <span className="text-xs text-slate-500 ml-2">
                      ({eventType.count.toLocaleString()})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEventTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedEventTypes.map(type => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
                >
                  {type}
                  <button
                    onClick={() => handleEventTypeChange(type)}
                    className="hover:text-orange-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Reset Button */}
        <div>
          <Button
            variant="outline"
            onClick={resetFilters}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Active Filters Summary */}
      <div className="mt-4 pt-4 border-t border-slate-200 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-medium">Active Filters:</span>
          <span>
            {dateFrom && dateTo 
              ? `${dateFrom} to ${dateTo}` 
              : 'All time'}
          </span>
          {selectedStates.length > 0 && (
            <>
              <span>•</span>
              <span>{selectedStates.length} state(s)</span>
            </>
          )}
          {selectedEventTypes.length > 0 && (
            <>
              <span>•</span>
              <span>{selectedEventTypes.length} event type(s)</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}