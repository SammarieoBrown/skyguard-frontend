import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const states = searchParams.get('states')?.split(',').filter(Boolean);
    const eventTypes = searchParams.get('eventTypes')?.split(',').filter(Boolean);
    const limit = parseInt(searchParams.get('limit') || '5');
    
    // Build WHERE clause with parameters
    const whereConditions = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;
    
    // Only include events with significant impact (damage > 100k or casualties)
    whereConditions.push(`(
      (damage_property + damage_crops) > 100000 
      OR (deaths_direct + deaths_indirect) > 0
      OR (injuries_direct + injuries_indirect) > 5
    )`);
    
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
    
    // Get recent major events with full details
    const recentEventsQuery = `
      SELECT 
        event_type_clean as event_type,
        state,
        state_clean,
        event_datetime as date,
        damage_property,
        damage_crops,
        (damage_property + damage_crops) as total_damage,
        deaths_direct,
        deaths_indirect,
        (deaths_direct + deaths_indirect) as total_deaths,
        injuries_direct,
        injuries_indirect,
        (injuries_direct + injuries_indirect) as total_injuries,
        (deaths_direct + deaths_indirect + injuries_direct + injuries_indirect) as total_casualties,
        magnitude_filled as magnitude,
        CASE 
          WHEN (damage_property + damage_crops) > 1000000000 THEN 'Catastrophic'
          WHEN (damage_property + damage_crops) > 100000000 THEN 'Extreme'
          WHEN (damage_property + damage_crops) > 10000000 THEN 'Severe'
          WHEN (damage_property + damage_crops) > 1000000 THEN 'Major'
          WHEN (deaths_direct + deaths_indirect) > 10 THEN 'Deadly'
          WHEN (deaths_direct + deaths_indirect) > 0 THEN 'Fatal'
          WHEN (injuries_direct + injuries_indirect) > 50 THEN 'Mass Casualty'
          WHEN (injuries_direct + injuries_indirect) > 10 THEN 'Multi-Injury'
          ELSE 'Significant'
        END as severity_class,
        CASE 
          WHEN (damage_property + damage_crops) > 0 THEN 
            LOG((damage_property + damage_crops) + 1) * 
            (1 + (deaths_direct + deaths_indirect) * 0.5 + (injuries_direct + injuries_indirect) * 0.1)
          ELSE 
            (deaths_direct + deaths_indirect) * 10 + (injuries_direct + injuries_indirect)
        END as impact_score
      FROM storm_events
      ${whereClause}
      ORDER BY impact_score DESC, event_datetime DESC
      LIMIT $${paramIndex}
    `;
    
    params.push(limit);
    
    // Execute query
    const events = await query(recentEventsQuery, params);
    
    // Format the response
    const formattedEvents = events.map((event: {
      event_type: string;
      state: string;
      state_clean: string;
      date: string;
      damage_property: string;
      damage_crops: string;
      total_damage: string;
      deaths_direct: string;
      deaths_indirect: string;
      total_deaths: string;
      injuries_direct: string;
      injuries_indirect: string;
      total_injuries: string;
      total_casualties: string;
      magnitude: string;
      severity_class: string;
      impact_score: string;
    }) => ({
      event_type: event.event_type,
      state: event.state,
      state_name: event.state_clean,
      date: event.date,
      damage: {
        property: parseFloat(event.damage_property) || 0,
        crops: parseFloat(event.damage_crops) || 0,
        total: parseFloat(event.total_damage) || 0
      },
      casualties: {
        deaths: {
          direct: parseInt(event.deaths_direct) || 0,
          indirect: parseInt(event.deaths_indirect) || 0,
          total: parseInt(event.total_deaths) || 0
        },
        injuries: {
          direct: parseInt(event.injuries_direct) || 0,
          indirect: parseInt(event.injuries_indirect) || 0,
          total: parseInt(event.total_injuries) || 0
        },
        total: parseInt(event.total_casualties) || 0
      },
      magnitude: parseFloat(event.magnitude) || null,
      severity_class: event.severity_class,
      impact_score: parseFloat(event.impact_score) || 0
    }));
    
    return NextResponse.json({
      events: formattedEvents,
      count: formattedEvents.length,
      filters: {
        dateFrom,
        dateTo,
        states,
        eventTypes
      }
    });
    
  } catch (error) {
    console.error('Error fetching recent events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent events', details: error },
      { status: 500 }
    );
  }
}