"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  MapPin, 
  TrendingUp, 
  Loader2,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Award
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  getStateRisk, 
  getMultiStateRisk, 
  getRiskRankings, 
  getEventTypeRisk,
  EVENT_TYPES,
  STATE_CODES
} from '@/lib/api';
import { stateCodeToName } from '@/lib/state-names';

interface EventType {
  event_type: string;
  risk_score: number;
  occurrences: number;
  count?: number;
}

interface StateRank {
  state?: string;
  state_code?: string;
  risk_score: number;
  ranking?: number;
}

interface StateData {
  state: string;
  state_code?: string;
  risk_score: number;
  risk_level: string;
  confidence: number;
  risk_category?: string;
  predicted_annual_risk?: number;
  risk_description?: string;
  components?: {
    frequency?: number;
    severity?: number;
    vulnerability?: number;
    trend?: number;
  };
}

interface StateInfo {
  state: string;
  score: number;
  occurrences: number;
  event_count?: number;
  risk_score?: number;
}

interface RiskResults {
  risk_score?: number;
  risk_level?: string;
  confidence?: number;
  historical_data?: {
    average_events_per_year?: number;
    most_common_event?: string;
    highest_impact_event?: string;
  };
  historical_events?: Record<string, string | number>;
  predicted_annual_risk?: number;
  top_event_types?: EventType[];
  rankings?: StateRank[];
  comparison?: StateData[];
  risk_factors?: Record<string, string | number>;
  analysis?: Record<string, string | number>;
  predicted_risk?: number;
  event_correlation?: Record<string, number>;
  top_states?: StateInfo[];
  summary?: {
    total_states_analyzed?: number;
    average_risk_score?: number;
    highest_risk_state?: {
      state: string;
      risk_score: number;
    };
    lowest_risk_state?: {
      state: string;
      risk_score: number;
    };
    risk_distribution?: Record<string, number>;
    national_average_risk?: number;
    most_common_event_type?: {
      event_type: string;
      count: number;
    };
  };
  state?: string;
  state_code?: string;
  risk_category?: string;
  risk_description?: string;
  components?: {
    frequency: number;
    severity: number;
    vulnerability: number;
    trend: number;
  };
  states?: StateData[] | Record<string, StateData>;
  risks?: StateData[] | Record<string, StateData>;
  event_type?: string;
  risk_metrics?: {
    average_risk_score: number;
    max_risk_score: number;
    total_events: number;
    affected_states: number;
  };
}

export default function RiskAssessment() {
  const [activeTab, setActiveTab] = useState('state');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RiskResults | null>(null);

  // Form states
  const [selectedState, setSelectedState] = useState('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedEventType, setSelectedEventType] = useState('');
  const [rankingLimit, setRankingLimit] = useState(10);

  const handleStateRiskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedState) return;
    
    setLoading(true);
    try {
      const response = await getStateRisk(selectedState);
      setResults(response.data);
    } catch (error) {
      console.error('State risk analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMultiStateRiskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStates.length === 0) return;
    
    setLoading(true);
    try {
      const response = await getMultiStateRisk({ state_codes: selectedStates });
      console.log('Multi-state risk response:', response.data);
      setResults(response.data);
    } catch (error) {
      console.error('Multi-state risk analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRankingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await getRiskRankings({ limit: rankingLimit });
      const data = response.data;
      if (Array.isArray(data)) {
        setResults({ rankings: data });
      } else {
        setResults(data);
      }
    } catch (error) {
      console.error('Risk rankings failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventTypeRiskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventType) return;
    
    setLoading(true);
    try {
      const response = await getEventTypeRisk(selectedEventType);
      setResults(response.data);
    } catch (error) {
      console.error('Event type risk analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };


  const addState = (state: string) => {
    if (state && !selectedStates.includes(state)) {
      setSelectedStates([...selectedStates, state]);
    }
  };

  const removeState = (state: string) => {
    setSelectedStates(selectedStates.filter(s => s !== state));
  };

  const getRiskColor = (score: number) => {
    if (score >= 8) return 'text-red-600 bg-red-100';
    if (score >= 6) return 'text-orange-600 bg-orange-100';
    if (score >= 4) return 'text-yellow-600 bg-yellow-100';
    if (score >= 2) return 'text-blue-600 bg-blue-100';
    return 'text-green-600 bg-green-100';
  };

  const getRiskLevel = (score: number) => {
    if (score >= 8.5) return 'Extreme';
    if (score >= 7) return 'Very High';
    if (score >= 5) return 'High';
    if (score >= 3) return 'Moderate';
    return 'Low';
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Analysis Complete</span>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Risk Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* State Risk Results */}
              {(results.state || results.state_code) && results.risk_score && (
                <div className="space-y-4">
                  {/* Main Risk Score Card */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="h-8 w-8 text-blue-600" />
                      <div>
                        <div className="font-medium">{stateCodeToName[results.state as string] || stateCodeToName[results.state_code as string] || results.state || results.state_code} Risk Assessment</div>
                        <div className="text-sm text-slate-600">
                          {results.risk_category || getRiskLevel(results.risk_score)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {results.risk_score.toFixed(1)}
                      </div>
                      <div className="text-sm text-slate-600">out of 10</div>
                    </div>
                  </div>
                  
                  {/* Risk Description */}
                  {results.risk_description && (
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-800">{results.risk_description}</p>
                    </div>
                  )}
                  
                  {/* Risk Components Breakdown */}
                  {results.components && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-slate-600" />
                        Risk Components Analysis
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-xs text-slate-500 mb-1">Frequency</div>
                          <div className="flex items-center gap-2">
                            <div className="text-lg font-semibold">{results.components.frequency.toFixed(2)}</div>
                            <div className="flex-1 bg-slate-200 rounded-full h-2">
                              <div 
                                className="h-2 bg-gradient-to-r from-green-500 to-red-500 rounded-full" 
                                style={{ width: `${(results.components.frequency / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-xs text-slate-500 mb-1">Severity</div>
                          <div className="flex items-center gap-2">
                            <div className="text-lg font-semibold">{results.components.severity.toFixed(2)}</div>
                            <div className="flex-1 bg-slate-200 rounded-full h-2">
                              <div 
                                className="h-2 bg-gradient-to-r from-green-500 to-red-500 rounded-full" 
                                style={{ width: `${(results.components.severity / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-xs text-slate-500 mb-1">Vulnerability</div>
                          <div className="flex items-center gap-2">
                            <div className="text-lg font-semibold">{results.components.vulnerability.toFixed(2)}</div>
                            <div className="flex-1 bg-slate-200 rounded-full h-2">
                              <div 
                                className="h-2 bg-gradient-to-r from-green-500 to-red-500 rounded-full" 
                                style={{ width: `${(results.components.vulnerability / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-xs text-slate-500 mb-1">Trend</div>
                          <div className="flex items-center gap-2">
                            <div className="text-lg font-semibold">{results.components.trend.toFixed(2)}</div>
                            <div className="flex-1 bg-slate-200 rounded-full h-2">
                              <div 
                                className="h-2 bg-gradient-to-r from-green-500 to-red-500 rounded-full" 
                                style={{ width: `${(results.components.trend / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Historical Events Summary */}
                  {results.historical_events && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-slate-600" />
                        Historical Events Summary
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {Object.entries(results.historical_events).map(([key, value]: [string, string | number]) => (
                          <div key={key} className="p-3 bg-slate-50 rounded-lg">
                            <div className="text-xs text-slate-500 mb-1 capitalize">{key.replace('_', ' ')}</div>
                            <div className="text-lg font-semibold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Top Event Types */}
                  {results.top_event_types && results.top_event_types.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-slate-600" />
                        Most Common Event Types
                      </h4>
                      <div className="space-y-2">
                        {results.top_event_types.slice(0, 5).map((event: EventType, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="capitalize">{event.event_type}</div>
                            <div className="text-sm font-medium text-slate-600">{event.count} events</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rankings Results */}
              {results.rankings && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-600" />
                    State Risk Rankings
                  </h4>
                  {results.rankings.slice(0, 10).map((item: StateRank, index: number) => (
                    <div key={(item.state_code as string) || (item.state as string) || index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full text-sm font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{stateCodeToName[(item.state_code as string) || (item.state as string)] || item.state_code || item.state}</div>
                          <div className="text-sm text-slate-600">Risk Level: {getRiskLevel(item.risk_score)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(item.risk_score)}`}>
                          {item.risk_score.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Multi-state comparison */}
              {(() => {
                const multiStateData = results.states || results.risks;
                const normalizedStates: StateData[] = Array.isArray(multiStateData)
                  ? (multiStateData as StateData[])
                  : multiStateData
                    ? (Object.values(multiStateData) as StateData[])
                    : [];
                return normalizedStates.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Multi-State Risk Comparison
                  </h4>
                  
                  {/* State Risk Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {normalizedStates.map((stateData: StateData) => {
                      const risk = Number(stateData.risk_score ?? 0);
                      const stateLabel = stateCodeToName[stateData.state_code as string]
                        || stateCodeToName[stateData.state as string]
                        || (stateData.state_code || stateData.state || 'Unknown');
                      return (
                      <div key={stateData.state_code || stateData.state} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-lg">{stateLabel}</h5>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(risk)}`}>
                            {risk.toFixed(1)}
                          </div>
                        </div>
                        
                        {stateData.risk_category && (
                          <div className="mb-2">
                            <span className="text-sm font-medium">{stateData.risk_category}</span>
                          </div>
                        )}
                        
                        {stateData.risk_description && (
                          <p className="text-sm text-slate-600 mb-3">{stateData.risk_description}</p>
                        )}
                        
                        {stateData.components && (
                          <div className="space-y-2">
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Risk Components</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Frequency:</span>
                                <span className="font-medium">{stateData.components.frequency?.toFixed(2) ?? 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Severity:</span>
                                <span className="font-medium">{stateData.components.severity?.toFixed(2) ?? 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Vulnerability:</span>
                                <span className="font-medium">{stateData.components.vulnerability?.toFixed(2) ?? 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Trend:</span>
                                <span className="font-medium">{stateData.components.trend?.toFixed(2) ?? 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                  
                  {/* Comparison Chart */}
                  <div className="mt-4">
                    <ChartBoundary>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={normalizedStates.map((s: StateData) => ({
                          ...s,
                          state: s.state_code || s.state
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="state" />
                          <YAxis domain={[0, 10]} />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload[0]) {
                                const data = payload[0].payload as StateData & { state?: string };
                                const label = stateCodeToName[data.state] || data.state;
                                const score = Number(data.risk_score ?? 0).toFixed(2);
                                return (
                                  <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                                    <p className="font-medium">{label}</p>
                                    <p className="text-sm">Risk Score: {score}</p>
                                    {data.risk_category && (
                                      <p className="text-sm">Category: {data.risk_category}</p>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="risk_score" fill="#3b82f6" name="Risk Score" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartBoundary>
                  </div>
                </div>
                ) : (
                  results.risks ? (
                    <div className="space-y-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-sm text-slate-600">No visual summary available; displaying quick list.</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {Object.entries(results.risks as Record<string, StateData>).map(([code, s]) => (
                          <div key={code} className="flex items-center justify-between bg-white border border-slate-200 rounded px-3 py-2">
                            <span className="font-medium">{stateCodeToName[code] || code}</span>
                            <span className="text-slate-700">{Number((s as StateData).risk_score || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                );
              })()}

              {/* Event Type Risk Results */}
              {results.event_type && results.risk_metrics && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                      <div>
                        <div className="font-medium capitalize">{results.event_type} Risk Analysis</div>
                        <div className="text-sm text-slate-600">Event-specific risk assessment</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Risk Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-xs text-slate-500 mb-1">Avg Risk Score</div>
                      <div className="text-lg font-semibold">{results.risk_metrics.average_risk_score.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-xs text-slate-500 mb-1">Max Risk Score</div>
                      <div className="text-lg font-semibold">{results.risk_metrics.max_risk_score.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-xs text-slate-500 mb-1">Total Events</div>
                      <div className="text-lg font-semibold">{results.risk_metrics.total_events.toLocaleString()}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-xs text-slate-500 mb-1">Affected States</div>
                      <div className="text-lg font-semibold">{results.risk_metrics.affected_states}</div>
                    </div>
                  </div>
                  
                  {/* Top States for Event Type */}
                  {results.top_states && results.top_states.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Most Affected States</h4>
                      <div className="space-y-2">
                        {results.top_states.slice(0, 5).map((state: StateInfo, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="font-medium">{stateCodeToName[state.state as string] || state.state}</div>
                              <div className="text-sm text-slate-600">{state.event_count} events</div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(state.risk_score || state.score)}`}>
                              Risk: {(state.risk_score || state.score).toFixed(1)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Simple boundary to prevent 3rd-party chart errors from breaking the page
  const ChartBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    try {
      return <>{children}</>;
    } catch {
      return (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
          Unable to render chart.
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="state">State Risk</TabsTrigger>
          <TabsTrigger value="multi-state">Multi-State</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="event-type">Event Type</TabsTrigger>
        </TabsList>

        <TabsContent value="state" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                State Risk Assessment
              </CardTitle>
              <CardDescription>
                Analyze severe weather risk for a specific state
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStateRiskSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select State</label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a state" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATE_CODES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {stateCodeToName[state] || state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={loading || !selectedState} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze State Risk'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multi-state" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Multi-State Comparison
              </CardTitle>
              <CardDescription>
                Compare risk levels across multiple states
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMultiStateRiskSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Add States</label>
                  <Select onValueChange={addState}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose states to compare" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATE_CODES.filter(state => !selectedStates.includes(state)).map((state) => (
                        <SelectItem key={state} value={state}>
                          {stateCodeToName[state] || state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedStates.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Selected States ({selectedStates.length})</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedStates.map((state) => (
                        <div key={state} className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                          {stateCodeToName[state] || state}
                          <button
                            type="button"
                            onClick={() => removeState(state)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={loading || selectedStates.length === 0} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Comparing...
                    </>
                  ) : (
                    'Compare States'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rankings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                Risk Rankings
              </CardTitle>
              <CardDescription>
                View states ranked by severe weather risk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRankingsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Number of States</label>
                  <Select value={rankingLimit.toString()} onValueChange={(value) => setRankingLimit(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Top 5</SelectItem>
                      <SelectItem value="10">Top 10</SelectItem>
                      <SelectItem value="20">Top 20</SelectItem>
                      <SelectItem value="50">All States</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading Rankings...
                    </>
                  ) : (
                    'Get Risk Rankings'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="event-type" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Event Type Risk Analysis
              </CardTitle>
              <CardDescription>
                Analyze risk by specific weather event type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEventTypeRiskSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Event Type</label>
                  <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={loading || !selectedEventType} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Event Type Risk'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {renderResults()}
    </div>
  );
} 