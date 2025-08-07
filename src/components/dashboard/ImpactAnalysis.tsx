"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Users, 
  AlertTriangle, 
  Loader2,
  TrendingUp,
  MapPin,
  Activity,
  CheckCircle
} from 'lucide-react';
import { 
  predictPropertyDamage, 
  predictCasualtyRisk, 
  predictSeverity, 
  getComprehensiveAssessment,
  EVENT_TYPES,
  STATE_CODES,
  TORNADO_SCALES,
  PropertyDamageRequest,
  CasualtyRiskRequest,
  SeverityRequest,
  ComprehensiveAssessmentRequest
} from '@/lib/api';

interface Factor {
  factor: string;
  correlation: number;
  importance: number;
  value?: number | string;
}

interface PopulationRiskFactor {
  [key: string]: string | number;
}

interface ImpactResults {
  predicted_damage?: number;
  confidence?: number;
  damage_category?: string;
  influential_factors?: Factor[];
  risk_score?: number;
  risk_level?: string;
  confidence_interval?: { lower: number; upper: number };
  population_risk_factors?: PopulationRiskFactor;
  severity_score?: number;
  severity?: {
    impact_factors?: Record<string, string | number>;
    severity_class?: string;
    description?: string;
    confidence_score?: number;
  };
  severity_assessment?: {
    impact_factors?: Record<string, string | number>;
    severity_class?: string;
    description?: string;
    confidence_score?: number;
  };
  severity_category?: string;
  confidence_score?: number;
  prediction_factors?: Factor[];
  impact_factors?: Record<string, string | number>;
  error?: string;
  prediction_range?: {
    low_estimate: number;
    high_estimate: number;
  };
  casualty_risk_score?: number;
  risk_category?: string;
  probability?: {
    no_casualties: number;
    minor_injuries?: number;
    major_injuries?: number;
    fatalities?: number;
  };
  severity_class?: string;
  description?: string;
  event_params?: Record<string, string | number>;
  property_damage_assessment?: {
    predicted_damage?: number;
    property_damage?: number;
    prediction_range?: {
      low_estimate: number;
      high_estimate: number;
    };
    confidence_score?: number;
    damage_category?: string;
    influential_factors?: Factor[];
  };
  property_damage?: {
    predicted_damage?: number;
    property_damage?: number;
    prediction_range?: {
      low_estimate: number;
      high_estimate: number;
    };
    confidence_score?: number;
    damage_category?: string;
    influential_factors?: Factor[];
  };
  casualty_risk_assessment?: {
    risk_score?: number;
    risk_level?: string;
    confidence_interval?: { lower: number; upper: number };
    population_risk_factors?: PopulationRiskFactor;
    risk_category?: string;
    casualty_risk_score?: number;
    casualty_risk?: number;
    probability?: {
      no_casualties: number;
      minor_injuries?: number;
      major_injuries?: number;
      fatalities?: number;
    };
  };
  casualty_risk?: {
    risk_score?: number;
    risk_level?: string;
    confidence_interval?: { lower: number; upper: number };
    population_risk_factors?: PopulationRiskFactor;
    risk_category?: string;
    casualty_risk_score?: number;
    casualty_risk?: number;
    probability?: {
      no_casualties: number;
      minor_injuries?: number;
      major_injuries?: number;
      fatalities?: number;
    };
  };
  severity_assessment_details?: {
    severity_score?: number;
    severity_category?: string;
    confidence_score?: number;
    prediction_factors?: Factor[];
  };
}

export default function ImpactAnalysis() {
  const [activeTab, setActiveTab] = useState('property');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImpactResults | null>(null);

  // Form states with proper defaults
  const [propertyForm, setPropertyForm] = useState<PropertyDamageRequest>({
    event_type: '',
    state: '',
    magnitude: 0,
    duration_hours: 1
  });

  const [casualtyForm, setCasualtyForm] = useState<CasualtyRiskRequest>({
    event_type: '',
    state: '',
    magnitude: 0,
    tor_f_scale: ''
  });

  const [severityForm, setSeverityForm] = useState<SeverityRequest>({
    event_type: '',
    state: '',
    magnitude: 0,
    property_damage: 0,
    injuries: 0,
    deaths: 0
  });

  const [comprehensiveForm, setComprehensiveForm] = useState<ComprehensiveAssessmentRequest>({
    event_type: '',
    state: '',
    magnitude: 0,
    duration_hours: 1
  });

  // Helper function to safely convert string to number
  const safeParseFloat = (value: string): number => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const safeParseInt = (value: string): number => {
    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handlePropertyDamageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await predictPropertyDamage(propertyForm);
      console.log('Property damage response:', response.data);
      setResults(response.data);
    } catch (error) {
      console.error('Property damage prediction failed:', error);
      setResults({ error: 'Failed to predict property damage. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCasualtyRiskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await predictCasualtyRisk(casualtyForm);
      setResults(response.data);
    } catch (error) {
      console.error('Casualty risk prediction failed:', error);
      setResults({ error: 'Failed to predict casualty risk. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSeveritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await predictSeverity(severityForm);
      setResults(response.data);
    } catch (error) {
      console.error('Severity prediction failed:', error);
      setResults({ error: 'Failed to predict severity. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleComprehensiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await getComprehensiveAssessment(comprehensiveForm);
      setResults(response.data);
    } catch (error) {
      console.error('Comprehensive assessment failed:', error);
      setResults({ error: 'Failed to run comprehensive assessment. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const renderResults = () => {
    if (!results) return null;

    if (results.error) {
      return (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Error</span>
          </div>
          <Card>
            <CardContent className="p-4">
              <p className="text-red-600">{results.error}</p>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // Helper function to render risk factors
    const renderInfluentialFactors = (factors: Factor[]) => {
      if (!factors || factors.length === 0) return null;
      
      return (
        <div className="mt-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-slate-600" />
            Key Risk Factors
          </h4>
          <div className="space-y-2">
            {factors.map((factor: Factor, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium capitalize">
                    {factor.factor.replace('_', ' ')}
                  </div>
                  <div className="text-sm text-slate-600">
                    {factor.value !== undefined ? (factor.factor === 'magnitude' ? `${factor.value} mph` : factor.value) : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-slate-500">Impact:</div>
                  <div className="flex items-center">
                    <div 
                      className="h-2 bg-blue-500 rounded-full" 
                      style={{ width: `${factor.importance * 100}px` }}
                    />
                    <span className="ml-2 text-sm font-medium">{(factor.importance * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };
    
    // Helper function to render population risk factors
    const renderPopulationRiskFactors = (factors: PopulationRiskFactor) => {
      if (!factors) return null;
      
      return (
        <div className="mt-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            Population Risk Assessment
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Population Density</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div 
                    className="h-2 bg-gradient-to-r from-green-500 to-red-500 rounded-full" 
                    style={{ width: `${Number(factors.population_density) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {(Number(factors.population_density) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Vulnerable Population</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div 
                    className="h-2 bg-gradient-to-r from-green-500 to-red-500 rounded-full" 
                    style={{ width: `${Number(factors.vulnerable_population) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {(Number(factors.vulnerable_population) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Infrastructure Resilience</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div 
                    className="h-2 bg-gradient-to-r from-red-500 to-green-500 rounded-full" 
                    style={{ width: `${Number(factors.infrastructure_resilience) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {(Number(factors.infrastructure_resilience) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Analysis Complete</span>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Prediction Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Display different results based on the type */}
              {results.predicted_damage !== undefined && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-8 w-8 text-blue-600" />
                      <div>
                        <div className="font-medium">Property Damage</div>
                        <div className="text-sm text-slate-600">Estimated loss</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(results.predicted_damage || 0)}
                    </div>
                  </div>
                  
                  {results.prediction_range && (
                    <div className="px-4 pb-2 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Prediction range:</span>
                        <span className="font-medium">
                          {formatCurrency(results.prediction_range.low_estimate)} - {formatCurrency(results.prediction_range.high_estimate)}
                        </span>
                      </div>
                    </div>
                  )}
                  {results.confidence_score !== undefined && (
                    <div className="px-4 pb-2 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Model confidence:</span>
                        <span className="font-medium">
                          {(results.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {results.casualty_risk_score !== undefined && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-red-600" />
                      <div>
                        <div className="font-medium">Casualty Risk</div>
                        <div className="text-sm text-slate-600">
                          {results.risk_category || 'Probability score'}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {((results.casualty_risk_score || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  
                  {results.probability && (
                    <div className="px-4 pb-2 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>No casualties probability:</span>
                        <span className="font-medium text-green-600">
                          {(results.probability.no_casualties * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {results.severity_class && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                      <div>
                        <div className="font-medium">Severity Level</div>
                        <div className="text-sm text-slate-600">Event classification</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {results.severity_class || 'Unknown'}
                    </div>
                  </div>
                  
                  {/* Display additional severity details if available */}
                  {results.description && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700">{results.description}</p>
                      {results.confidence_score && (
                        <p className="text-xs text-slate-500 mt-1">
                          Confidence: {(results.confidence_score * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Comprehensive assessment results - handle both nested and direct structure */}
              {(results.property_damage_assessment || results.property_damage) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-8 w-8 text-blue-600" />
                      <div>
                        <div className="font-medium">Property Damage Assessment</div>
                        <div className="text-sm text-slate-600">Predicted loss</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(
                        results.property_damage_assessment?.predicted_damage ||
                        results.property_damage_assessment?.property_damage ||
                        results.property_damage?.predicted_damage ||
                        results.property_damage?.property_damage ||
                        0
                      )}
                    </div>
                  </div>
                  
                  {((results.property_damage_assessment?.prediction_range || results.property_damage?.prediction_range) && (
                    <div className="px-4 pb-2 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Prediction range:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            results.property_damage_assessment?.prediction_range?.low_estimate ||
                            results.property_damage?.prediction_range?.low_estimate || 0
                          )} - {formatCurrency(
                            results.property_damage_assessment?.prediction_range?.high_estimate ||
                            results.property_damage?.prediction_range?.high_estimate || 0
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                  {((results.property_damage_assessment?.confidence_score ?? results.property_damage?.confidence_score) !== undefined && (
                    <div className="px-4 pb-2 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>Model confidence:</span>
                        <span className="font-medium">
                          {((results.property_damage_assessment?.confidence_score || results.property_damage?.confidence_score || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {(results.casualty_risk_assessment || results.casualty_risk) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8 text-red-600" />
                      <div>
                        <div className="font-medium">Casualty Assessment</div>
                        <div className="text-sm text-slate-600">
                          {results.casualty_risk_assessment?.risk_category || 
                         results.casualty_risk?.risk_category || 
                         'Risk probability'}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {((
                        results.casualty_risk_assessment?.casualty_risk_score ||
                        results.casualty_risk_assessment?.casualty_risk ||
                        results.casualty_risk?.casualty_risk_score ||
                        results.casualty_risk?.casualty_risk ||
                        0
                      ) * 100).toFixed(1)}%
                    </div>
                  </div>
                  
                  {(results.casualty_risk_assessment?.probability || results.casualty_risk?.probability) && (
                    <div className="px-4 pb-2 text-sm text-slate-600">
                      <div className="flex justify-between">
                        <span>No casualties probability:</span>
                        <span className="font-medium text-green-600">
                          {((
                            results.casualty_risk_assessment?.probability?.no_casualties ||
                            results.casualty_risk?.probability?.no_casualties || 0
                          ) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {(results.severity_assessment || results.severity) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                      <div>
                        <div className="font-medium">Severity Assessment</div>
                        <div className="text-sm text-slate-600">Classification</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {results.severity_assessment?.severity_class || 
                       results.severity?.severity_class || 
                       'Unknown'}
                    </div>
                  </div>
                  
                  {(results.severity_assessment?.description || results.severity?.description) && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700">
                        {results.severity_assessment?.description || results.severity?.description}
                      </p>
                      {(results.severity_assessment?.confidence_score ?? results.severity?.confidence_score) && (
                        <p className="text-xs text-slate-500 mt-1">
                          Confidence: {((
                            results.severity_assessment?.confidence_score || 
                            results.severity?.confidence_score || 0
                          ) * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Add influential factors for comprehensive assessment */}
              {(results.property_damage_assessment?.influential_factors || results.property_damage?.influential_factors) && 
                renderInfluentialFactors(
                  results.property_damage_assessment?.influential_factors || 
                  results.property_damage?.influential_factors || []
                )}
              
              {(results.casualty_risk_assessment?.population_risk_factors || results.casualty_risk?.population_risk_factors) && 
                renderPopulationRiskFactors(
                  results.casualty_risk_assessment?.population_risk_factors || 
                  results.casualty_risk?.population_risk_factors || {}
                )}
              
              {/* Impact factors from severity assessment */}
              {(results.severity?.impact_factors || results.severity_assessment?.impact_factors) && 
                Object.keys(results.severity?.impact_factors || results.severity_assessment?.impact_factors || {}).length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-slate-600" />
                    Impact Factors
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(results.severity?.impact_factors || results.severity_assessment?.impact_factors || {}).map(([key, value]: [string, string | number]) => (
                      <div key={key} className="p-3 bg-slate-50 rounded-lg">
                        <div className="text-sm font-medium capitalize mb-1">
                          {key.replace('_', ' ')}
                        </div>
                        <div className="text-sm text-slate-600">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              

              {/* Event Parameters Summary */}
              {results.event_params && (
                <div className="mt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-slate-600" />
                    Event Parameters
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="p-2 bg-slate-50 rounded">
                      <div className="text-xs text-slate-500">Event Type</div>
                      <div className="font-medium capitalize">{results.event_params.event_type}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <div className="text-xs text-slate-500">Location</div>
                      <div className="font-medium">{results.event_params.state}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <div className="text-xs text-slate-500">Wind Speed</div>
                      <div className="font-medium">{results.event_params.magnitude} mph</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <div className="text-xs text-slate-500">Duration</div>
                      <div className="font-medium">{results.event_params.duration_hours} hr{results.event_params.duration_hours !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Influential Factors from non-comprehensive results */}
              {!results.property_damage && !results.casualty_risk && !results.severity && (
                <>
                  {results.influential_factors && renderInfluentialFactors(results.influential_factors)}
                  {results.population_risk_factors && renderPopulationRiskFactors(results.population_risk_factors)}
                  {results.impact_factors && Object.keys(results.impact_factors).length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-slate-600" />
                        Impact Factors
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(results.impact_factors).map(([key, value]: [string, string | number]) => (
                          <div key={key} className="p-3 bg-slate-50 rounded-lg">
                            <div className="text-sm font-medium capitalize mb-1">
                              {key.replace('_', ' ')}
                            </div>
                            <div className="text-sm text-slate-600">{String(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="property">Property Damage</TabsTrigger>
          <TabsTrigger value="casualty">Casualty Risk</TabsTrigger>
          <TabsTrigger value="severity">Severity</TabsTrigger>
          <TabsTrigger value="comprehensive">Comprehensive</TabsTrigger>
        </TabsList>

        <TabsContent value="property" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Property Damage Prediction
              </CardTitle>
              <CardDescription>
                Estimate potential property damage based on weather event parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePropertyDamageSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select 
                      value={propertyForm.event_type} 
                      onValueChange={(value) => setPropertyForm({...propertyForm, event_type: value})}
                    >
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

                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select 
                      value={propertyForm.state} 
                      onValueChange={(value) => setPropertyForm({...propertyForm, state: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATE_CODES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Magnitude (mph)</Label>
                    <Input
                      type="number"
                      value={propertyForm.magnitude || ''}
                      onChange={(e) => setPropertyForm({...propertyForm, magnitude: safeParseFloat(e.target.value)})}
                      placeholder="Wind speed in mph"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (hours)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={propertyForm.duration_hours || ''}
                      onChange={(e) => setPropertyForm({...propertyForm, duration_hours: safeParseFloat(e.target.value)})}
                      placeholder="Event duration"
                      min="0"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Predict Property Damage'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="casualty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-red-600" />
                Casualty Risk Assessment
              </CardTitle>
              <CardDescription>
                Assess the probability of casualties from severe weather events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCasualtyRiskSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select 
                      value={casualtyForm.event_type} 
                      onValueChange={(value) => setCasualtyForm({...casualtyForm, event_type: value})}
                    >
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

                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select 
                      value={casualtyForm.state} 
                      onValueChange={(value) => setCasualtyForm({...casualtyForm, state: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATE_CODES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Magnitude (mph)</Label>
                    <Input
                      type="number"
                      value={casualtyForm.magnitude || ''}
                      onChange={(e) => setCasualtyForm({...casualtyForm, magnitude: safeParseFloat(e.target.value)})}
                      placeholder="Wind speed in mph"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tornado Scale (optional)</Label>
                    <Select 
                      value={casualtyForm.tor_f_scale || ''} 
                      onValueChange={(value) => setCasualtyForm({...casualtyForm, tor_f_scale: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tornado scale" />
                      </SelectTrigger>
                      <SelectContent>
                        {TORNADO_SCALES.map((scale) => (
                          <SelectItem key={scale} value={scale}>
                            {scale}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Assess Casualty Risk'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="severity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Severity Classification
              </CardTitle>
              <CardDescription>
                Classify event severity based on impact metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSeveritySubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select 
                      value={severityForm.event_type} 
                      onValueChange={(value) => setSeverityForm({...severityForm, event_type: value})}
                    >
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

                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select 
                      value={severityForm.state} 
                      onValueChange={(value) => setSeverityForm({...severityForm, state: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATE_CODES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Magnitude (mph)</Label>
                    <Input
                      type="number"
                      value={severityForm.magnitude || ''}
                      onChange={(e) => setSeverityForm({...severityForm, magnitude: safeParseFloat(e.target.value)})}
                      placeholder="Wind speed in mph"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Property Damage ($)</Label>
                    <Input
                      type="number"
                      value={severityForm.property_damage || ''}
                      onChange={(e) => setSeverityForm({...severityForm, property_damage: safeParseFloat(e.target.value)})}
                      placeholder="Damage in USD"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Injuries</Label>
                    <Input
                      type="number"
                      value={severityForm.injuries || ''}
                      onChange={(e) => setSeverityForm({...severityForm, injuries: safeParseInt(e.target.value)})}
                      placeholder="Number of injuries"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Deaths</Label>
                    <Input
                      type="number"
                      value={severityForm.deaths || ''}
                      onChange={(e) => setSeverityForm({...severityForm, deaths: safeParseInt(e.target.value)})}
                      placeholder="Number of deaths"
                      min="0"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Classify Severity'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comprehensive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Comprehensive Assessment
              </CardTitle>
              <CardDescription>
                Get a complete impact analysis including all prediction models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleComprehensiveSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select 
                      value={comprehensiveForm.event_type} 
                      onValueChange={(value) => setComprehensiveForm({...comprehensiveForm, event_type: value})}
                    >
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

                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select 
                      value={comprehensiveForm.state} 
                      onValueChange={(value) => setComprehensiveForm({...comprehensiveForm, state: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATE_CODES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Magnitude (mph)</Label>
                    <Input
                      type="number"
                      value={comprehensiveForm.magnitude || ''}
                      onChange={(e) => setComprehensiveForm({...comprehensiveForm, magnitude: safeParseFloat(e.target.value)})}
                      placeholder="Wind speed in mph"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (hours)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={comprehensiveForm.duration_hours || ''}
                      onChange={(e) => setComprehensiveForm({...comprehensiveForm, duration_hours: safeParseFloat(e.target.value)})}
                      placeholder="Event duration"
                      min="0"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running comprehensive analysis...
                    </>
                  ) : (
                    'Run Comprehensive Assessment'
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