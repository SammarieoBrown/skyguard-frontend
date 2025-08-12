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
import { getStateName } from '@/lib/state-names';

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
  
  // Helper function to determine magnitude label based on event type
  const getMagnitudeLabel = (eventType: string): string => {
    const eventLower = eventType.toLowerCase();
    if (eventLower.includes('tornado') || eventLower.includes('wind') || eventLower.includes('hurricane')) {
      return 'Wind Speed (mph)';
    } else if (eventLower.includes('heat') || eventLower.includes('cold')) {
      return 'Temperature (°F)';
    } else if (eventLower.includes('rain') || eventLower.includes('flood') || eventLower.includes('snow')) {
      return 'Precipitation (inches)';
    } else if (eventLower.includes('drought')) {
      return 'Severity Index';
    } else if (eventLower.includes('hail')) {
      return 'Hail Size (inches)';
    }
    return 'Magnitude';
  };

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
    
    // Validate form inputs
    if (!propertyForm.event_type || !propertyForm.state) {
      setResults({ error: 'Please select both event type and state.' });
      return;
    }
    
    if (propertyForm.magnitude <= 0) {
      setResults({ error: 'Please enter a valid magnitude value greater than 0.' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await predictPropertyDamage(propertyForm);
      console.log('Property damage response:', response.data);
      
      // Check if we got a valid response
      if (response.data && response.data.predicted_damage !== undefined) {
        setResults(response.data);
      } else {
        setResults({ 
          error: 'The prediction model returned an invalid response. This may be due to insufficient training data for this event type and location combination.',
          predicted_damage: 0,
          confidence_score: 0
        });
      }
    } catch (error) {
      console.error('Property damage prediction failed:', error);
      setResults({ error: 'Failed to connect to the prediction service. Please try again.' });
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
              {/* Display error messages */}
              {results.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-800">{results.error}</div>
                  </div>
                </div>
              )}
              
              {/* Display different results based on the type */}
              {results.predicted_damage !== undefined && (
                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-4 rounded-lg ${
                    results.predicted_damage === 0 ? 'bg-gray-50' : 'bg-blue-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <DollarSign className={`h-8 w-8 ${
                        results.predicted_damage === 0 ? 'text-gray-600' : 'text-blue-600'
                      }`} />
                      <div>
                        <div className="font-medium">Property Damage</div>
                        <div className="text-sm text-slate-600">
                          {results.predicted_damage === 0 ? 'No damage predicted' : 'Estimated loss'}
                        </div>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${
                      results.predicted_damage === 0 ? 'text-gray-600' : 'text-blue-600'
                    }`}>
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
                  
                  {results.predicted_damage === 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Activity className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-xs text-amber-800">
                          <p className="font-medium mb-1">Model Note:</p>
                          <p>A $0 prediction may indicate:</p>
                          <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
                            <li>The event magnitude is below the damage threshold</li>
                            <li>Limited historical data for this event type in this region</li>
                            <li>The model needs additional training data</li>
                          </ul>
                          <p className="mt-2">Try adjusting the magnitude or selecting a different event type/location combination.</p>
                        </div>
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
              
              
              {/* Impact factors from severity assessment */}
              {(results.severity?.impact_factors || results.severity_assessment?.impact_factors) && 
                Object.keys(results.severity?.impact_factors || results.severity_assessment?.impact_factors || {}).length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-slate-600" />
                    Impact Factors
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(results.severity?.impact_factors || results.severity_assessment?.impact_factors || {})
                      .map(([key, value]: [string, unknown]) => {
                        // Parse the value if it's an object or try to parse if it's a JSON string
                        let displayValue = '';
                        
                        if (typeof value === 'object' && value !== null) {
                          // Handle objects with type assertion
                          const objValue = value as Record<string, unknown>;
                          if (key === 'property_damage' || key === 'property damage') {
                            displayValue = objValue.value ? `$${(objValue.value as number).toLocaleString()}` : JSON.stringify(value);
                            if (objValue.impact_level) {
                              displayValue += ` (${objValue.impact_level})`;
                            }
                          } else if (key === 'casualties') {
                            if (objValue.injuries !== undefined || objValue.deaths !== undefined) {
                              displayValue = `Injuries: ${objValue.injuries || 0}, Deaths: ${objValue.deaths || 0}`;
                              if (objValue.total) {
                                displayValue += ` (Total: ${objValue.total})`;
                              }
                              if (objValue.impact_level) {
                                displayValue += ` - ${objValue.impact_level}`;
                              }
                            } else {
                              displayValue = JSON.stringify(value);
                            }
                          } else {
                            displayValue = JSON.stringify(value);
                          }
                        } else {
                          displayValue = String(value);
                        }
                        
                        return (
                          <div key={key} className="p-3 bg-slate-50 rounded-lg">
                            <div className="text-sm font-medium capitalize mb-1">
                              {key.replace(/_/g, ' ')}
                            </div>
                            <div className="text-sm text-slate-600">
                              {displayValue}
                            </div>
                          </div>
                        );
                      })}
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
                  {results.impact_factors && Object.keys(results.impact_factors).length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-slate-600" />
                        Impact Factors
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(results.impact_factors)
                          .map(([key, value]: [string, unknown]) => {
                            // Parse the value if it's an object or try to parse if it's a JSON string
                            let displayValue = '';
                            
                            if (typeof value === 'object' && value !== null) {
                              // Handle objects with type assertion
                              const objValue = value as Record<string, unknown>;
                              if (key === 'property_damage' || key === 'property damage') {
                                displayValue = objValue.value ? `$${(objValue.value as number).toLocaleString()}` : JSON.stringify(value);
                                if (objValue.impact_level) {
                                  displayValue += ` (${objValue.impact_level})`;
                                }
                              } else if (key === 'casualties') {
                                if (objValue.injuries !== undefined || objValue.deaths !== undefined) {
                                  displayValue = `Injuries: ${objValue.injuries || 0}, Deaths: ${objValue.deaths || 0}`;
                                  if (objValue.total) {
                                    displayValue += ` (Total: ${objValue.total})`;
                                  }
                                  if (objValue.impact_level) {
                                    displayValue += ` - ${objValue.impact_level}`;
                                  }
                                } else {
                                  displayValue = JSON.stringify(value);
                                }
                              } else {
                                displayValue = JSON.stringify(value);
                              }
                            } else {
                              displayValue = String(value);
                            }
                            
                            return (
                              <div key={key} className="p-3 bg-slate-50 rounded-lg">
                                <div className="text-sm font-medium capitalize mb-1">
                                  {key.replace(/_/g, ' ')}
                                </div>
                                <div className="text-sm text-slate-600">
                                  {displayValue}
                                </div>
                              </div>
                            );
                          })}
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
                            {getStateName(state)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{getMagnitudeLabel(propertyForm.event_type)}</Label>
                    <Input
                      type="number"
                      value={propertyForm.magnitude || ''}
                      onChange={(e) => setPropertyForm({...propertyForm, magnitude: safeParseFloat(e.target.value)})}
                      placeholder={getMagnitudeLabel(propertyForm.event_type).toLowerCase()}
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

                <Button type="submit" disabled={loading}>
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
                            {getStateName(state)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{getMagnitudeLabel(casualtyForm.event_type)}</Label>
                    <Input
                      type="number"
                      value={casualtyForm.magnitude || ''}
                      onChange={(e) => setCasualtyForm({...casualtyForm, magnitude: safeParseFloat(e.target.value)})}
                      placeholder={getMagnitudeLabel(casualtyForm.event_type).toLowerCase()}
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

                <Button type="submit" disabled={loading}>
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
                            {getStateName(state)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{getMagnitudeLabel(severityForm.event_type)}</Label>
                    <Input
                      type="number"
                      value={severityForm.magnitude || ''}
                      onChange={(e) => setSeverityForm({...severityForm, magnitude: safeParseFloat(e.target.value)})}
                      placeholder={getMagnitudeLabel(severityForm.event_type).toLowerCase()}
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

                <Button type="submit" disabled={loading}>
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
                            {getStateName(state)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{getMagnitudeLabel(comprehensiveForm.event_type)}</Label>
                    <Input
                      type="number"
                      value={comprehensiveForm.magnitude || ''}
                      onChange={(e) => setComprehensiveForm({...comprehensiveForm, magnitude: safeParseFloat(e.target.value)})}
                      placeholder={getMagnitudeLabel(comprehensiveForm.event_type).toLowerCase()}
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

                <Button type="submit" disabled={loading}>
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