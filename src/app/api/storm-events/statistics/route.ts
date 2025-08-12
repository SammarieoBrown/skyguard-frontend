import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const states = searchParams.get('states')?.split(',').filter(Boolean);
    const eventTypes = searchParams.get('eventTypes')?.split(',').filter(Boolean);
    
    // Build WHERE clause with parameters
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
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Main statistics query
    const statsQuery = `
      SELECT 
        COUNT(*) as total_events,
        COALESCE(SUM(damage_property), 0) as total_property_damage,
        COALESCE(SUM(damage_crops), 0) as total_crop_damage,
        COALESCE(SUM(damage_property + damage_crops), 0) as total_damage,
        COALESCE(SUM(deaths_direct + deaths_indirect), 0) as total_deaths,
        COALESCE(SUM(injuries_direct + injuries_indirect), 0) as total_injuries,
        COALESCE(SUM(deaths_direct + deaths_indirect + injuries_direct + injuries_indirect), 0) as total_casualties,
        COUNT(DISTINCT state) as affected_states,
        COUNT(DISTINCT event_type_clean) as unique_event_types
      FROM storm_events
      ${whereClause}
    `;
    
    // Most common event type query
    const eventTypeQuery = `
      SELECT 
        event_type_clean,
        COUNT(*) as count
      FROM storm_events
      ${whereClause ? whereClause + ' AND event_type_clean IS NOT NULL' : 'WHERE event_type_clean IS NOT NULL'}
      GROUP BY event_type_clean
      ORDER BY count DESC
      LIMIT 1
    `;
    
    // Highest damage state query
    const stateQuery = `
      SELECT 
        state,
        state_clean,
        SUM(damage_property + damage_crops) as total_damage
      FROM storm_events
      ${whereClause ? whereClause + ' AND state IS NOT NULL' : 'WHERE state IS NOT NULL'}
      GROUP BY state, state_clean
      ORDER BY total_damage DESC
      LIMIT 1
    `;
    
    // Recent major event query
    const recentEventQuery = `
      SELECT 
        event_type_clean as event_type,
        state,
        event_datetime as date,
        (damage_property + damage_crops) as damage,
        (deaths_direct + deaths_indirect) as deaths,
        (injuries_direct + injuries_indirect) as injuries
      FROM storm_events
      ${whereClause ? whereClause + ' AND' : 'WHERE'} (
        (damage_property + damage_crops) > 1000000 
        OR (deaths_direct + deaths_indirect) > 0
      )
      ORDER BY event_datetime DESC
      LIMIT 1
    `;
    
    // Execute all queries in parallel
    const [statsRows, eventTypeRows, stateRows, recentEventRows] = await Promise.all([
      query(statsQuery, params),
      query(eventTypeQuery, params),
      query(stateQuery, params),
      query(recentEventQuery, params)
    ]);
    
    const stats = statsRows?.[0];
    const mostCommonEvent = eventTypeRows?.[0];
    const highestDamageState = stateRows?.[0];
    const recentMajorEvent = recentEventRows?.[0];
    
    const response = {
      total_events: parseInt(stats?.total_events) || 0,
      total_property_damage: parseFloat(stats?.total_property_damage) || 0,
      total_crop_damage: parseFloat(stats?.total_crop_damage) || 0,
      total_damage: parseFloat(stats?.total_damage) || 0,
      total_deaths: parseInt(stats?.total_deaths) || 0,
      total_injuries: parseInt(stats?.total_injuries) || 0,
      total_casualties: parseInt(stats?.total_casualties) || 0,
      affected_states: parseInt(stats?.affected_states) || 0,
      unique_event_types: parseInt(stats?.unique_event_types) || 0,
      most_common_event: mostCommonEvent?.event_type_clean || 'N/A',
      most_common_event_count: parseInt(mostCommonEvent?.count) || 0,
      highest_damage_state: highestDamageState?.state || 'N/A',
      highest_damage_state_name: highestDamageState?.state_clean || 'N/A',
      highest_damage_amount: parseFloat(highestDamageState?.total_damage) || 0,
      recent_major_event: recentMajorEvent ? {
        event_type: recentMajorEvent.event_type,
        state: recentMajorEvent.state,
        date: recentMajorEvent.date,
        damage: parseFloat(recentMajorEvent.damage) || 0,
        deaths: parseInt(recentMajorEvent.deaths) || 0,
        injuries: parseInt(recentMajorEvent.injuries) || 0
      } : null,
      filters: {
        dateFrom,
        dateTo,
        states,
        eventTypes
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics', details: error },
      { status: 500 }
    );
  }
}