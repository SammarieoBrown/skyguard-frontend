import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types for API requests and responses
export interface PropertyDamageRequest {
  event_type: string;
  state: string;
  magnitude: number;
  duration_hours: number;
}

export interface CasualtyRiskRequest {
  event_type: string;
  state: string;
  magnitude: number;
  tor_f_scale?: string;
}

export interface SeverityRequest {
  event_type: string;
  state: string;
  magnitude: number;
  property_damage: number;
  injuries: number;
  deaths: number;
}

export interface ComprehensiveAssessmentRequest {
  event_type: string;
  state: string;
  magnitude: number;
  duration_hours: number;
}

export interface StateRiskRequest {
  state_code: string;
}

export interface MultiStateRiskRequest {
  state_codes: string[];
}

export interface RiskRankingsRequest {
  limit?: number;
  ascending?: boolean;
}

export interface EventTypeRiskRequest {
  event_type: string;
}

export interface ScenarioModification {
  parameter: string;
  modification_type: 'set' | 'add' | 'multiply';
  value: number | string;
}

export interface BaseEvent {
  event_type: string;
  state: string;
  magnitude: number;
  duration_hours?: number;
  tor_f_scale?: string;
}

export interface ScenarioSimulationRequest {
  base_event: BaseEvent;
  modifications: ScenarioModification[];
  include_uncertainty?: boolean;
}

export interface BatchSimulationRequest {
  base_event: BaseEvent;
  scenario_sets: ScenarioModification[][];
  include_uncertainty?: boolean;
}

export interface SensitivityAnalysisRequest {
  base_event: BaseEvent;
  parameters: string[];
  variation_range: number;
}

// API Functions
export const healthCheck = () => api.get('/health');

export const getHello = (name: string) => api.get(`/hello/${name}`);

// Impact Analysis endpoints
export const predictPropertyDamage = (data: PropertyDamageRequest) =>
  api.post('/api/v1/impact/property-damage', data);

export const predictCasualtyRisk = (data: CasualtyRiskRequest) =>
  api.post('/api/v1/impact/casualty-risk', data);

export const predictSeverity = (data: SeverityRequest) =>
  api.post('/api/v1/impact/severity', data);

export const getComprehensiveAssessment = (data: ComprehensiveAssessmentRequest) =>
  api.post('/api/v1/impact/comprehensive-assessment', data);

export const impactHealthCheck = () => api.get('/api/v1/impact/healthcheck');

// Risk Assessment endpoints
export const getStateRisk = (stateCode: string) =>
  api.get(`/api/v1/risk/state/${stateCode}`);

export const postStateRisk = (data: StateRiskRequest) =>
  api.post('/api/v1/risk/state', data);

export const getMultiStateRisk = (data: MultiStateRiskRequest) =>
  api.post('/api/v1/risk/multi-state', data);

export const getRiskRankings = (params?: { limit?: number }) =>
  api.get('/api/v1/risk/rankings', { params });

export const postRiskRankings = (data: RiskRankingsRequest) =>
  api.post('/api/v1/risk/rankings', data);

export const getEventTypeRisk = (eventType: string) =>
  api.get(`/api/v1/risk/event-type/${eventType}`);

export const postEventTypeRisk = (data: EventTypeRiskRequest) =>
  api.post('/api/v1/risk/event-type', data);

export const getRiskSummary = () => api.get('/api/v1/risk/summary');

export const riskHealthCheck = () => api.get('/api/v1/risk/healthcheck');

// Simulation endpoints
export const runScenarioSimulation = (data: ScenarioSimulationRequest) =>
  api.post('/api/v1/simulation/scenario', data);

export const runBatchSimulation = (data: BatchSimulationRequest) =>
  api.post('/api/v1/simulation/batch', data);

export const runSensitivityAnalysis = (data: SensitivityAnalysisRequest) =>
  api.post('/api/v1/simulation/sensitivity', data);

export const getScenario = (scenarioId: string) =>
  api.get(`/api/v1/simulation/scenario/${scenarioId}`);

export const simulationHealthCheck = () => api.get('/api/v1/simulation/healthcheck');

// Constants from API categorical values
export const EVENT_TYPES = [
  "thunderstorm wind",
  "tornado",
  "hurricane",
  "hail",
  "flash flood",
  "flood",
  "wildfire",
  "winter storm",
  "high wind",
  "excessive heat",
  "drought",
  "lightning",
  "heavy rain",
  "blizzard",
  "ice storm"
];

export const STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL",
  "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "PR",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY"
];

export const TORNADO_SCALES = ["F0", "F1", "F2", "F3", "F4", "F5", "EF0", "EF1", "EF2", "EF3", "EF4", "EF5"];

export const MODIFICATION_TYPES = ["set", "add", "multiply"];

export const MODIFIABLE_PARAMETERS = [
  "magnitude",
  "duration_hours",
  "property_damage",
  "crop_damage",
  "injuries",
  "deaths",
  "event_type",
  "state",
  "tor_f_scale"
];

export default api; 