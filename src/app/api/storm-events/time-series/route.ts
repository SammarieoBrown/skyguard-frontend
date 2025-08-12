import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const metric = searchParams.get('metric') || 'damage';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const states = searchParams.get('states')?.split(',').filter(Boolean);
    const eventTypes = searchParams.get('eventTypes')?.split(',').filter(Boolean);
    const groupBy = searchParams.get('groupBy') || 'month';
    
    let dateFormat = '';
    
    switch (groupBy) {
      case 'day':
        dateFormat = `DATE(event_datetime)`;
        break;
      case 'week':
        dateFormat = `DATE_TRUNC('week', event_datetime)`;
        break;
      case 'month':
        dateFormat = `TO_CHAR(event_datetime, 'YYYY-MM')`;
        break;
      case 'year':
        dateFormat = `event_year`;
        break;
      default:
        dateFormat = `TO_CHAR(event_datetime, 'YYYY-MM')`;
    }
    
    let metricSelect = '';
    switch (metric) {
      case 'damage':
        metricSelect = 'COALESCE(SUM(damage_property + damage_crops), 0) as value';
        break;
      case 'property_damage':
        metricSelect = 'COALESCE(SUM(damage_property), 0) as value';
        break;
      case 'crop_damage':
        metricSelect = 'COALESCE(SUM(damage_crops), 0) as value';
        break;
      case 'casualties':
        metricSelect = 'COALESCE(SUM(deaths_direct + deaths_indirect + injuries_direct + injuries_indirect), 0) as value';
        break;
      case 'deaths':
        metricSelect = 'COALESCE(SUM(deaths_direct + deaths_indirect), 0) as value';
        break;
      case 'injuries':
        metricSelect = 'COALESCE(SUM(injuries_direct + injuries_indirect), 0) as value';
        break;
      case 'events':
        metricSelect = 'COUNT(*) as value';
        break;
      default:
        metricSelect = 'COALESCE(SUM(damage_property + damage_crops), 0) as value';
    }
    
    // Build where conditions with parameters
    const whereConditions = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;
    
    if (dateFrom) {
      whereConditions.push(`event_datetime >= $${paramIndex}::timestamp`);
      params.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      whereConditions.push(`event_datetime <= $${paramIndex}::timestamp`);
      params.push(dateTo);
      paramIndex++;
    }
    
    if (states && states.length > 0) {
      const placeholders = states.map((_, i) => `$${paramIndex + i}`).join(',');
      whereConditions.push(`state IN (${placeholders})`);
      params.push(...states);
      paramIndex += states.length;
    }
    
    if (eventTypes && eventTypes.length > 0) {
      const placeholders = eventTypes.map((_, i) => `$${paramIndex + i}`).join(',');
      whereConditions.push(`event_type_clean IN (${placeholders})`);
      params.push(...eventTypes);
      paramIndex += eventTypes.length;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const queryText = `
      SELECT 
        ${dateFormat} as period,
        ${metricSelect},
        COUNT(*) as event_count,
        COUNT(DISTINCT state) as states_affected,
        COUNT(DISTINCT event_type_clean) as event_types
      FROM storm_events
      ${whereClause}
      GROUP BY ${dateFormat}
      ORDER BY ${dateFormat}
    `;
    
    // Execute query using pg client
    const rows = await query(queryText, params);
    
    let timeSeriesData = rows.map((row: {
      period: string | number;
      value: string;
      event_count: string;
      states_affected: string;
      event_types: string;
    }) => ({
      period: row.period,
      value: metric.includes('damage') ? parseFloat(row.value) : parseInt(row.value),
      event_count: parseInt(row.event_count),
      states_affected: parseInt(row.states_affected),
      event_types: parseInt(row.event_types)
    }));

    // Fill in missing years when grouping by year
    if (groupBy === 'year' && timeSeriesData.length > 0) {
      const minYear = Math.min(...timeSeriesData.map(d => parseInt(String(d.period))));
      const maxYear = Math.max(...timeSeriesData.map(d => parseInt(String(d.period))));
      
      // If date filters are provided, use them to determine the range
      let startYear = minYear;
      let endYear = maxYear;
      
      if (dateFrom) {
        startYear = new Date(dateFrom).getFullYear();
      }
      if (dateTo) {
        endYear = new Date(dateTo).getFullYear();
      }
      
      // Create array with all years in range
      const allYears = [];
      for (let year = startYear; year <= endYear; year++) {
        const existingData = timeSeriesData.find(d => d.period === year);
        if (existingData) {
          allYears.push(existingData);
        } else {
          allYears.push({
            period: year,
            value: 0,
            event_count: 0,
            states_affected: 0,
            event_types: 0
          });
        }
      }
      
      timeSeriesData = allYears.sort((a, b) => Number(a.period) - Number(b.period));
    }
    
    // Calculate additional statistics
    const values = timeSeriesData.map(d => d.value);
    const stats = values.length > 0 ? {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      total: values.reduce((a, b) => a + b, 0),
      dataPoints: values.length
    } : {
      min: 0,
      max: 0,
      avg: 0,
      total: 0,
      dataPoints: 0
    };
    
    return NextResponse.json({
      data: timeSeriesData,
      stats,
      metric,
      groupBy,
      filters: {
        dateFrom,
        dateTo,
        states,
        eventTypes
      }
    });
    
  } catch (error) {
    console.error('Error fetching time series data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time series data', details: error },
      { status: 500 }
    );
  }
}