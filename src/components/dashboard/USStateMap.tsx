"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStateName } from '@/lib/state-names';

interface StateData {
  state: string;
  state_name: string;
  metric_value: number;
  event_count: number;
  total_damage: number;
  total_casualties: number;
  avg_severity: number;
  details: {
    property_damage: number;
    crop_damage: number;
    deaths: number;
    injuries: number;
    max_damage: number;
    avg_magnitude: number;
  };
}

interface USStateMapProps {
  dateFrom?: string;
  dateTo?: string;
  states?: string[];
  eventTypes?: string[];
  onStateClick?: (state: string) => void;
}

const metricOptions = [
  { label: 'Total Damage ($)', value: 'total_damage' },
  { label: 'Property Damage ($)', value: 'property_damage' },
  { label: 'Crop Damage ($)', value: 'crop_damage' },
  { label: 'Total Casualties', value: 'casualties' },
  { label: 'Deaths', value: 'deaths' },
  { label: 'Injuries', value: 'injuries' },
  { label: 'Event Count', value: 'event_count' },
  { label: 'Average Severity', value: 'avg_severity' }
];

// State name to abbreviation mapping
const stateNameToAbbr: { [key: string]: string } = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC'
};

export default function USStateMap({ dateFrom, dateTo, states, eventTypes, onStateClick }: USStateMapProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StateData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState('total_damage');
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const fetchMapData = useCallback(async (metric?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        metric: metric || selectedMetric,
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(states?.length && { states: states.join(',') }),
        ...(eventTypes?.length && { eventTypes: eventTypes.join(',') })
      });

      const response = await fetch(`/api/storm-events/map-data?${params}`);
      const result = await response.json();
      
      if (result.data) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching map data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMetric, dateFrom, dateTo, states, eventTypes]);

  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      if (mounted) {
        await fetchMapData();
      }
    };
    
    fetchData();
    
    return () => {
      mounted = false;
    };
  }, [fetchMapData]);

  const formatValue = (value: number, metric: string) => {
    if (metric.includes('damage')) {
      if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
      if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
      return `$${value.toFixed(0)}`;
    }
    if (metric === 'avg_severity') {
      return value.toFixed(2);
    }
    return value.toLocaleString();
  };

  useEffect(() => {
    if (!data.length || loading) return;
    
    let mounted = true;

    const drawMap = async () => {
      if (!mounted) return;
      try {
        // Fetch US topology data
        const us = await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json');
        
        if (!us) return;

        const width = 960;
        const height = 600;

        // Clear previous map
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
          .attr('viewBox', `0 0 ${width} ${height}`)
          .attr('width', '100%')
          .attr('height', '100%');

        // Create data map for quick lookup - normalize state codes to uppercase
        const dataMap = new Map(data.map(d => [d.state.toUpperCase(), d]));

        // Get max value for color scale
        const maxValue = Math.max(...data.map(d => d.metric_value), 1);
        const minValue = Math.min(...data.map(d => d.metric_value), 0);

        // Create color scale
        const colorScale = d3.scaleSequential()
          .domain([minValue, maxValue])
          .interpolator(d3.interpolateBlues);

        // Draw states
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const states = feature(us as any, (us as any).objects.states);
        
        svg.append('g')
          .selectAll('path')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .data((states as any).features)
          .enter()
          .append('path')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .attr('d', d3.geoPath() as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .attr('fill', (d: any) => {
            const stateName = d.properties.name;
            const stateAbbr = stateNameToAbbr[stateName];
            const stateData = dataMap.get(stateAbbr);
            return stateData ? colorScale(stateData.metric_value) : '#f5f5f5';
          })
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1)
          .style('cursor', 'pointer')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .on('mouseover', function(event: MouseEvent, d: any) {
            const stateName = d.properties.name;
            const stateAbbr = stateNameToAbbr[stateName];
            const stateData = dataMap.get(stateAbbr);
            
            d3.select(this)
              .attr('stroke', '#1e40af')
              .attr('stroke-width', 2);
            
            // Show tooltip
            if (tooltipRef.current) {
              if (stateData) {
                const metricLabel = metricOptions.find(m => m.value === selectedMetric)?.label || 'Value';
                tooltipRef.current.innerHTML = `
                  <div class="p-3">
                    <div class="font-semibold text-sm mb-2">${getStateName(stateAbbr)}</div>
                    <div class="space-y-1 text-xs">
                      <div>${metricLabel}: <span class="font-semibold">${formatValue(stateData.metric_value, selectedMetric)}</span></div>
                      <div>Events: ${stateData.event_count.toLocaleString()}</div>
                      <div>Total Damage: ${formatValue(stateData.total_damage, 'damage')}</div>
                      <div>Casualties: ${stateData.total_casualties}</div>
                    </div>
                  </div>
                `;
              } else {
                tooltipRef.current.innerHTML = `
                  <div class="p-3">
                    <div class="font-semibold text-sm mb-2">${getStateName(stateAbbr)}</div>
                    <div class="text-xs text-gray-500">No data available</div>
                  </div>
                `;
              }
              tooltipRef.current.style.display = 'block';
              tooltipRef.current.style.left = `${event.pageX + 10}px`;
              tooltipRef.current.style.top = `${event.pageY - 10}px`;
            }
          })
          .on('mouseout', function() {
            d3.select(this)
              .attr('stroke', '#ffffff')
              .attr('stroke-width', 1);
            
            if (tooltipRef.current) {
              tooltipRef.current.style.display = 'none';
            }
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .on('click', (_event: MouseEvent, d: any) => {
            const stateName = d.properties.name;
            const stateAbbr = stateNameToAbbr[stateName];
            if (stateAbbr && onStateClick) {
              onStateClick(stateAbbr);
            }
          });

        // Add color legend
        const legendWidth = 300;
        const legendHeight = 10;
        
        const legend = svg.append('g')
          .attr('transform', `translate(${width - legendWidth - 20}, ${height - 40})`);

        // Create gradient for legend
        const gradientId = 'gradient-' + Date.now();
        const gradient = svg.append('defs')
          .append('linearGradient')
          .attr('id', gradientId);

        const steps = 10;
        for (let i = 0; i <= steps; i++) {
          gradient.append('stop')
            .attr('offset', `${(i / steps) * 100}%`)
            .attr('stop-color', colorScale(minValue + (maxValue - minValue) * (i / steps)));
        }

        legend.append('rect')
          .attr('width', legendWidth)
          .attr('height', legendHeight)
          .style('fill', `url(#${gradientId})`);

        legend.append('text')
          .attr('x', 0)
          .attr('y', -5)
          .style('font-size', '12px')
          .style('fill', '#64748b')
          .text(formatValue(minValue, selectedMetric));

        legend.append('text')
          .attr('x', legendWidth)
          .attr('y', -5)
          .attr('text-anchor', 'end')
          .style('font-size', '12px')
          .style('fill', '#64748b')
          .text(formatValue(maxValue, selectedMetric));

        legend.append('text')
          .attr('x', legendWidth / 2)
          .attr('y', 25)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('fill', '#64748b')
          .text(metricOptions.find(m => m.value === selectedMetric)?.label || '');

      } catch (error) {
        console.error('Error drawing map:', error);
      }
    };

    drawMap();
    
    return () => {
      mounted = false;
    };
  }, [data, loading, selectedMetric, onStateClick]);

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Storm Events by State
            </CardTitle>
            <Select 
              value={selectedMetric} 
              onValueChange={(value) => {
                setSelectedMetric(value);
                fetchMapData(value);
              }}
            >
              <SelectTrigger className="w-48">
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
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : data.length > 0 ? (
            <div className="relative">
              <svg ref={svgRef}></svg>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 text-slate-500">
              No data available for the selected filters
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg pointer-events-none"
        style={{ display: 'none' }}
      />
    </>
  );
}