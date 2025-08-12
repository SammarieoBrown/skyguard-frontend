import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const metric = searchParams.get('metric') || 'total_damage';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const eventTypes = searchParams.get('eventTypes')?.split(',').filter(Boolean);
    
    // Build WHERE conditions
    const whereConditions = ['state IS NOT NULL'];
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
    
    if (eventTypes && eventTypes.length > 0) {
      const placeholders = eventTypes.map((_, i) => `$${paramIndex + i}`).join(',');
      whereConditions.push(`event_type_clean IN (${placeholders})`);
      params.push(...eventTypes);
      paramIndex += eventTypes.length;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const queryText = `
      SELECT 
        state,
        state_clean,
        COUNT(*) as event_count,
        COALESCE(SUM(damage_property), 0) as total_property_damage,
        COALESCE(SUM(damage_crops), 0) as total_crop_damage,
        COALESCE(SUM(damage_property + damage_crops), 0) as total_damage,
        COALESCE(SUM(deaths_direct + deaths_indirect), 0) as total_deaths,
        COALESCE(SUM(injuries_direct + injuries_indirect), 0) as total_injuries,
        COALESCE(SUM(deaths_direct + deaths_indirect + injuries_direct + injuries_indirect), 0) as total_casualties,
        COALESCE(AVG(magnitude_filled), 0) as avg_magnitude,
        COALESCE(MAX(damage_property + damage_crops), 0) as max_damage,
        COALESCE(AVG(
          CASE 
            WHEN damage_property > 0 THEN LOG(damage_property + 1) 
            ELSE 0 
          END
        ), 0) as avg_severity
      FROM storm_events
      WHERE ${whereClause}
      GROUP BY state, state_clean
      ORDER BY state
    `;
    
    const rows = await query(queryText, params);
    
    const stateData = rows.map((row: {
      state: string;
      state_clean: string;
      event_count: string;
      total_property_damage: string;
      total_crop_damage: string;
      total_damage: string;
      total_deaths: string;
      total_injuries: string;
      total_casualties: string;
      avg_magnitude: string;
      max_damage: string;
      avg_severity: string;
    }) => {
      let metricValue = 0;
      switch (metric) {
        case 'total_damage':
          metricValue = parseFloat(row.total_damage) || 0;
          break;
        case 'property_damage':
          metricValue = parseFloat(row.total_property_damage) || 0;
          break;
        case 'crop_damage':
          metricValue = parseFloat(row.total_crop_damage) || 0;
          break;
        case 'casualties':
          metricValue = parseInt(row.total_casualties) || 0;
          break;
        case 'deaths':
          metricValue = parseInt(row.total_deaths) || 0;
          break;
        case 'injuries':
          metricValue = parseInt(row.total_injuries) || 0;
          break;
        case 'event_count':
          metricValue = parseInt(row.event_count) || 0;
          break;
        case 'avg_severity':
          metricValue = parseFloat(row.avg_severity) || 0;
          break;
        default:
          metricValue = parseFloat(row.total_damage) || 0;
      }
      
      return {
        state: row.state,
        state_name: row.state_clean,
        metric_value: metricValue,
        event_count: parseInt(row.event_count),
        total_damage: parseFloat(row.total_damage),
        total_casualties: parseInt(row.total_casualties),
        avg_severity: parseFloat(row.avg_severity),
        details: {
          property_damage: parseFloat(row.total_property_damage),
          crop_damage: parseFloat(row.total_crop_damage),
          deaths: parseInt(row.total_deaths),
          injuries: parseInt(row.total_injuries),
          max_damage: parseFloat(row.max_damage),
          avg_magnitude: parseFloat(row.avg_magnitude)
        }
      };
    });
    
    return NextResponse.json({
      data: stateData,
      metric: metric,
      filters: {
        dateFrom,
        dateTo,
        eventTypes
      }
    });
    
  } catch (error) {
    console.error('Error fetching map data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch map data', details: error },
      { status: 500 }
    );
  }
}