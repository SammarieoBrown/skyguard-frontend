import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Get distinct states
    const statesQuery = `
      SELECT DISTINCT 
        state,
        state_clean
      FROM storm_events
      WHERE state IS NOT NULL 
        AND state != ''
      ORDER BY state
    `;
    
    // Get distinct event types
    const eventTypesQuery = `
      SELECT DISTINCT 
        event_type_clean as event_type,
        COUNT(*) as count
      FROM storm_events
      WHERE event_type_clean IS NOT NULL
      GROUP BY event_type_clean
      ORDER BY count DESC
    `;
    
    // Get date range
    const dateRangeQuery = `
      SELECT 
        MIN(event_datetime) as min_date,
        MAX(event_datetime) as max_date
      FROM storm_events
      WHERE event_datetime IS NOT NULL
    `;
    
    // Execute all queries in parallel
    const [statesResult, eventTypesResult, dateRangeResult] = await Promise.all([
      query(statesQuery),
      query(eventTypesQuery),
      query(dateRangeQuery)
    ]);
    
    const states = (statesResult || []).map((row: { state: string; state_clean: string }) => ({
      code: row.state,
      name: row.state_clean || row.state
    }));
    
    const eventTypes = (eventTypesResult || []).map((row: { event_type: string; count: string }) => ({
      name: row.event_type,
      count: parseInt(row.count)
    }));
    
    const dateRange = dateRangeResult?.[0];
    
    const response = {
      states,
      event_types: eventTypes,
      date_range: {
        min: dateRange?.min_date || null,
        max: dateRange?.max_date || null
      },
      // Preset date ranges for quick selection
      date_presets: [
        { label: 'Last 7 days', value: '7d' },
        { label: 'Last 30 days', value: '30d' },
        { label: 'Last 90 days', value: '90d' },
        { label: 'Last year', value: '1y' },
        { label: 'Last 5 years', value: '5y' },
        { label: 'Last 10 years', value: '10y' },
        { label: 'All time', value: 'all' }
      ],
      // Metric options for visualizations
      metrics: [
        { label: 'Total Damage', value: 'total_damage' },
        { label: 'Property Damage', value: 'property_damage' },
        { label: 'Crop Damage', value: 'crop_damage' },
        { label: 'Total Casualties', value: 'casualties' },
        { label: 'Deaths', value: 'deaths' },
        { label: 'Injuries', value: 'injuries' },
        { label: 'Event Count', value: 'event_count' },
        { label: 'Average Severity', value: 'avg_severity' }
      ]
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options', details: error },
      { status: 500 }
    );
  }
}