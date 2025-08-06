"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Zap, 
  BarChart3, 
  Loader2,
  Plus,
  Minus,
  CheckCircle,
  TrendingUp,
  Activity,
  DollarSign,
  Users,
  AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { 
  runScenarioSimulation, 
  runBatchSimulation, 
  runSensitivityAnalysis,
  EVENT_TYPES,
  STATE_CODES,
  TORNADO_SCALES,
  MODIFICATION_TYPES,
  MODIFIABLE_PARAMETERS,
  ScenarioSimulationRequest,
  BatchSimulationRequest,
  SensitivityAnalysisRequest,
  BaseEvent,
  ScenarioModification
} from '@/lib/api';

export default function ScenarioSimulation() {
  const [activeTab, setActiveTab] = useState('scenario');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Base event state
  const [baseEvent, setBaseEvent] = useState<BaseEvent>({
    event_type: '',
    state: '',
    magnitude: 0,
    duration_hours: 1
  });

  // Scenario modifications
  const [modifications, setModifications] = useState<ScenarioModification[]>([
    { parameter: 'magnitude', modification_type: 'multiply', value: 1.5 }
  ]);

  // Batch simulation
  const [batchScenarios, setBatchScenarios] = useState<ScenarioModification[][]>([
    [{ parameter: 'magnitude', modification_type: 'multiply', value: 1.2 }],
    [{ parameter: 'magnitude', modification_type: 'multiply', value: 1.5 }],
    [{ parameter: 'magnitude', modification_type: 'multiply', value: 2.0 }]
  ]);

  // Sensitivity analysis
  const [sensitivityParams, setSensitivityParams] = useState<string[]>(['magnitude']);
  const [variationRange, setVariationRange] = useState(0.3);

  const addModification = () => {
    setModifications([
      ...modifications,
      { parameter: 'magnitude', modification_type: 'multiply', value: 1.0 }
    ]);
  };

  const removeModification = (index: number) => {
    setModifications(modifications.filter((_, i) => i !== index));
  };

  const updateModification = (index: number, field: keyof ScenarioModification, value: any) => {
    const updated = [...modifications];
    updated[index] = { ...updated[index], [field]: value };
    setModifications(updated);
  };

  const addBatchScenario = () => {
    setBatchScenarios([
      ...batchScenarios,
      [{ parameter: 'magnitude', modification_type: 'multiply', value: 1.0 }]
    ]);
  };

  const removeBatchScenario = (index: number) => {
    setBatchScenarios(batchScenarios.filter((_, i) => i !== index));
  };

  const updateBatchScenario = (scenarioIndex: number, modIndex: number, field: keyof ScenarioModification, value: any) => {
    const updated = [...batchScenarios];
    updated[scenarioIndex][modIndex] = { ...updated[scenarioIndex][modIndex], [field]: value };
    setBatchScenarios(updated);
  };

  const addSensitivityParam = (param: string) => {
    if (param && !sensitivityParams.includes(param)) {
      setSensitivityParams([...sensitivityParams, param]);
    }
  };

  const removeSensitivityParam = (param: string) => {
    setSensitivityParams(sensitivityParams.filter(p => p !== param));
  };

  const handleScenarioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const request: ScenarioSimulationRequest = {
        base_event: baseEvent,
        modifications,
        include_uncertainty: true
      };
      const response = await runScenarioSimulation(request);
      setResults(response.data);
    } catch (error) {
      console.error('Scenario simulation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const request: BatchSimulationRequest = {
        base_event: baseEvent,
        scenario_sets: batchScenarios,
        include_uncertainty: false
      };
      const response = await runBatchSimulation(request);
      setResults(response.data);
    } catch (error) {
      console.error('Batch simulation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSensitivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const request: SensitivityAnalysisRequest = {
        base_event: baseEvent,
        parameters: sensitivityParams,
        variation_range: variationRange
      };
      const response = await runSensitivityAnalysis(request);
      setResults(response.data);
    } catch (error) {
      console.error('Sensitivity analysis failed:', error);
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

    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Simulation Complete</span>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Simulation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Scenario ID */}
              {results.scenario_id && (
                <div className="text-sm text-slate-600">
                  Scenario ID: <span className="font-mono">{results.scenario_id}</span>
                </div>
              )}

              {/* Display baseline vs modified results */}
              {results.base_prediction && results.modified_prediction && (
                <div className="space-y-6">
                  {/* Property Damage Comparison */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      Property Damage Comparison
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h5 className="text-sm font-medium text-blue-900 mb-2">Baseline Scenario</h5>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(results.base_prediction.property_damage?.predicted_damage || 0)}
                        </div>
                        {results.base_prediction.property_damage?.prediction_range && (
                          <div className="text-sm text-blue-700 mt-1">
                            Range: {formatCurrency(results.base_prediction.property_damage.prediction_range.low_estimate)} - 
                            {formatCurrency(results.base_prediction.property_damage.prediction_range.high_estimate)}
                          </div>
                        )}
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h5 className="text-sm font-medium text-purple-900 mb-2">Modified Scenario</h5>
                        <div className="text-2xl font-bold text-purple-600">
                          {formatCurrency(results.modified_prediction.property_damage?.predicted_damage || 0)}
                        </div>
                        {results.modified_prediction.property_damage?.prediction_range && (
                          <div className="text-sm text-purple-700 mt-1">
                            Range: {formatCurrency(results.modified_prediction.property_damage.prediction_range.low_estimate)} - 
                            {formatCurrency(results.modified_prediction.property_damage.prediction_range.high_estimate)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Casualty Risk Comparison */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5 text-red-600" />
                      Casualty Risk Comparison
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h5 className="text-sm font-medium text-blue-900 mb-2">Baseline Scenario</h5>
                        <div className="text-2xl font-bold text-blue-600">
                          {((results.base_prediction.casualty_risk?.casualty_risk_score || 0) * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-blue-700">
                          {results.base_prediction.casualty_risk?.risk_category || 'N/A'}
                        </div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h5 className="text-sm font-medium text-purple-900 mb-2">Modified Scenario</h5>
                        <div className="text-2xl font-bold text-purple-600">
                          {((results.modified_prediction.casualty_risk?.casualty_risk_score || 0) * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-purple-700">
                          {results.modified_prediction.casualty_risk?.risk_category || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Severity Comparison */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      Severity Classification Comparison
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h5 className="text-sm font-medium text-blue-900 mb-2">Baseline Scenario</h5>
                        <div className="text-lg font-bold text-blue-600">
                          {results.base_prediction.severity?.severity_class || 'N/A'}
                        </div>
                        {results.base_prediction.severity?.confidence_score && (
                          <div className="text-sm text-blue-700">
                            Confidence: {(results.base_prediction.severity.confidence_score * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h5 className="text-sm font-medium text-purple-900 mb-2">Modified Scenario</h5>
                        <div className="text-lg font-bold text-purple-600">
                          {results.modified_prediction.severity?.severity_class || 'N/A'}
                        </div>
                        {results.modified_prediction.severity?.confidence_score && (
                          <div className="text-sm text-purple-700">
                            Confidence: {(results.modified_prediction.severity.confidence_score * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Parameter Changes Summary */}
              {results.parameter_changes && Object.keys(results.parameter_changes).length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-slate-600" />
                    Parameter Changes Applied
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(results.parameter_changes).map(([param, change]: [string, any]) => (
                      <div key={param} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium capitalize">{param.replace('_', ' ')}</div>
                          <div className="text-xs text-slate-600">Type: {change.change_type}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            {change.original} → {change.modified}
                          </div>
                          {change.change_factor && (
                            <div className="text-xs text-slate-600">Factor: {change.change_factor}x</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Impact Analysis */}
              {results.impact_analysis && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-slate-600" />
                    Impact Analysis
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {results.impact_analysis.property_damage_change && (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">Property Damage Change</div>
                        <div className="text-lg font-semibold">
                          {results.impact_analysis.property_damage_change.change_percent > 0 ? '+' : ''}
                          {results.impact_analysis.property_damage_change.change_percent.toFixed(1)}%
                        </div>
                        <div className="text-sm text-slate-600">
                          {formatCurrency(Math.abs(results.impact_analysis.property_damage_change.change_amount))}
                        </div>
                      </div>
                    )}
                    {results.impact_analysis.casualty_risk_change && (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">Casualty Risk Change</div>
                        <div className="text-lg font-semibold">
                          {results.impact_analysis.casualty_risk_change.change_percent > 0 ? '+' : ''}
                          {results.impact_analysis.casualty_risk_change.change_percent.toFixed(1)}%
                        </div>
                        {results.impact_analysis.casualty_risk_change.category_change && (
                          <div className="text-sm text-orange-600">Category Changed</div>
                        )}
                      </div>
                    )}
                    {results.impact_analysis.overall_impact && (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">Overall Impact</div>
                        <div className="text-lg font-semibold">
                          {results.impact_analysis.overall_impact}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Batch results */}
              {results.scenarios && Array.isArray(results.scenarios) && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-slate-600" />
                    Batch Simulation Results
                  </h4>
                  
                  {/* Summary Stats */}
                  {results.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">Scenarios Run</div>
                        <div className="text-lg font-semibold">{results.scenarios.length}</div>
                      </div>
                      {results.summary.average_property_damage && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-xs text-slate-500 mb-1">Avg Property Damage</div>
                          <div className="text-lg font-semibold">
                            {formatCurrency(results.summary.average_property_damage)}
                          </div>
                        </div>
                      )}
                      {results.summary.max_property_damage && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-xs text-slate-500 mb-1">Max Property Damage</div>
                          <div className="text-lg font-semibold">
                            {formatCurrency(results.summary.max_property_damage)}
                          </div>
                        </div>
                      )}
                      {results.summary.max_risk_scenario && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-xs text-slate-500 mb-1">Highest Risk</div>
                          <div className="text-lg font-semibold">Scenario {results.summary.max_risk_scenario}</div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Individual Scenario Results */}
                  <div className="space-y-3">
                    {results.scenarios.map((scenario: any, index: number) => (
                      <div key={scenario.scenario_id || index} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">Scenario {index + 1}</h5>
                          {scenario.impact_analysis?.overall_impact && (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              scenario.impact_analysis.overall_impact === 'High' ? 'bg-red-100 text-red-700' :
                              scenario.impact_analysis.overall_impact === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {scenario.impact_analysis.overall_impact} Impact
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          {scenario.modified_prediction?.property_damage && (
                            <div>
                              <div className="text-xs text-slate-500">Property Damage</div>
                              <div className="font-semibold">
                                {formatCurrency(scenario.modified_prediction.property_damage.predicted_damage)}
                              </div>
                              {scenario.impact_analysis?.property_damage_change && (
                                <div className="text-xs text-slate-600">
                                  {scenario.impact_analysis.property_damage_change.change_percent > 0 ? '+' : ''}
                                  {scenario.impact_analysis.property_damage_change.change_percent.toFixed(1)}% vs baseline
                                </div>
                              )}
                            </div>
                          )}
                          
                          {scenario.modified_prediction?.casualty_risk && (
                            <div>
                              <div className="text-xs text-slate-500">Casualty Risk</div>
                              <div className="font-semibold">
                                {(scenario.modified_prediction.casualty_risk.casualty_risk_score * 100).toFixed(1)}%
                              </div>
                              <div className="text-xs text-slate-600">
                                {scenario.modified_prediction.casualty_risk.risk_category}
                              </div>
                            </div>
                          )}
                          
                          {scenario.modified_prediction?.severity && (
                            <div>
                              <div className="text-xs text-slate-500">Severity</div>
                              <div className="font-semibold">
                                {scenario.modified_prediction.severity.severity_class}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {scenario.parameter_changes && Object.keys(scenario.parameter_changes).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <div className="text-xs text-slate-500">Modifications:</div>
                            <div className="text-xs">
                              {Object.entries(scenario.parameter_changes).map(([param, change]: [string, any]) => (
                                <span key={param} className="inline-block mr-3">
                                  {param}: {change.original} → {change.modified}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sensitivity analysis results */}
              {(results.parameter_sensitivities || results.visualization_data) && (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-slate-600" />
                    Sensitivity Analysis Results
                  </h4>
                  
                  {/* Parameter Importance */}
                  {results.visualization_data?.parameter_importance && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Parameter Importance</h5>
                      <div className="space-y-2">
                        {results.visualization_data.parameter_importance.map((item: any) => (
                          <div key={item.parameter} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="text-sm font-medium capitalize">
                              {item.parameter.replace('_', ' ')}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 w-32 bg-slate-200 rounded-full h-2">
                                <div 
                                  className="h-2 bg-blue-500 rounded-full" 
                                  style={{ width: `${item.importance * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {(item.importance * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Elasticity Matrix */}
                  {results.visualization_data?.elasticity_matrix && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Impact Elasticity</h5>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Parameter
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Property Damage
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Casualty Risk
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                            {results.visualization_data.elasticity_matrix.map((row: any) => (
                              <tr key={row.parameter}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-900 capitalize">
                                  {row.parameter.replace('_', ' ')}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600">
                                  {row.property_damage.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600">
                                  {row.casualty_risk.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        * Elasticity values show the percentage change in outcome for a 1% change in parameter
                      </p>
                    </div>
                  )}
                  
                  {/* Parameter Sensitivities Details */}
                  {results.parameter_sensitivities && Object.keys(results.parameter_sensitivities).length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Detailed Sensitivities</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(results.parameter_sensitivities).map(([param, sensitivity]: [string, any]) => (
                          <div key={param} className="p-3 bg-slate-50 rounded-lg">
                            <div className="text-sm font-medium capitalize mb-2">
                              {param.replace('_', ' ')}
                            </div>
                            <div className="space-y-1 text-xs">
                              {sensitivity.property_damage_elasticity !== undefined && (
                                <div>Property Damage Elasticity: {sensitivity.property_damage_elasticity.toFixed(2)}</div>
                              )}
                              {sensitivity.casualty_risk_elasticity !== undefined && (
                                <div>Casualty Risk Elasticity: {sensitivity.casualty_risk_elasticity.toFixed(2)}</div>
                              )}
                              {sensitivity.overall_importance !== undefined && (
                                <div>Overall Importance: {(sensitivity.overall_importance * 100).toFixed(0)}%</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Uncertainty Metrics */}
              {results.uncertainty_metrics && Object.keys(results.uncertainty_metrics).length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-slate-600" />
                    Uncertainty Metrics
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(results.uncertainty_metrics).map(([metric, value]: [string, any]) => (
                      <div key={metric} className="p-3 bg-slate-50 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1 capitalize">
                          {metric.replace(/_/g, ' ').replace('cv', 'Coefficient of Variation')}
                        </div>
                        <div className="text-lg font-semibold">
                          {(value * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Base Event Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Base Event Configuration
          </CardTitle>
          <CardDescription>
            Define the baseline weather event for all simulations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select 
                value={baseEvent.event_type} 
                onValueChange={(value) => setBaseEvent({...baseEvent, event_type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
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
                value={baseEvent.state} 
                onValueChange={(value) => setBaseEvent({...baseEvent, state: value})}
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
                value={baseEvent.magnitude}
                onChange={(e) => setBaseEvent({...baseEvent, magnitude: parseFloat(e.target.value)})}
                placeholder="Wind speed"
              />
            </div>

            <div className="space-y-2">
              <Label>Duration (hours)</Label>
              <Input
                type="number"
                step="0.1"
                value={baseEvent.duration_hours}
                onChange={(e) => setBaseEvent({...baseEvent, duration_hours: parseFloat(e.target.value)})}
                placeholder="Duration"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scenario">Single Scenario</TabsTrigger>
          <TabsTrigger value="batch">Batch Simulation</TabsTrigger>
          <TabsTrigger value="sensitivity">Sensitivity Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="scenario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-600" />
                Single Scenario Simulation
              </CardTitle>
              <CardDescription>
                Modify specific parameters to see how they affect the outcome
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleScenarioSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Parameter Modifications</Label>
                    <Button type="button" onClick={addModification} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Modification
                    </Button>
                  </div>

                  {modifications.map((mod, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="space-y-2">
                        <Label>Parameter</Label>
                        <Select
                          value={mod.parameter}
                          onValueChange={(value) => updateModification(index, 'parameter', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MODIFIABLE_PARAMETERS.map((param) => (
                              <SelectItem key={param} value={param}>
                                {param.replace('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Modification Type</Label>
                        <Select
                          value={mod.modification_type}
                          onValueChange={(value) => updateModification(index, 'modification_type', value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MODIFICATION_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Value</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={mod.value}
                          onChange={(e) => updateModification(index, 'value', parseFloat(e.target.value))}
                        />
                      </div>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          onClick={() => removeModification(index)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running Simulation...
                    </>
                  ) : (
                    'Run Scenario Simulation'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                Batch Simulation
              </CardTitle>
              <CardDescription>
                Run multiple scenarios simultaneously to compare outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBatchSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Scenario Sets ({batchScenarios.length})</Label>
                    <Button type="button" onClick={addBatchScenario} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Scenario
                    </Button>
                  </div>

                  {batchScenarios.map((scenario, scenarioIndex) => (
                    <div key={scenarioIndex} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Scenario {scenarioIndex + 1}</h4>
                        <Button
                          type="button"
                          onClick={() => removeBatchScenario(scenarioIndex)}
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {scenario.map((mod, modIndex) => (
                        <div key={modIndex} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Select
                            value={mod.parameter}
                            onValueChange={(value) => updateBatchScenario(scenarioIndex, modIndex, 'parameter', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Parameter" />
                            </SelectTrigger>
                            <SelectContent>
                              {MODIFIABLE_PARAMETERS.map((param) => (
                                <SelectItem key={param} value={param}>
                                  {param.replace('_', ' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={mod.modification_type}
                            onValueChange={(value) => updateBatchScenario(scenarioIndex, modIndex, 'modification_type', value as any)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {MODIFICATION_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type.charAt(0).toUpperCase() + type.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Input
                            type="number"
                            step="0.1"
                            value={mod.value}
                            onChange={(e) => updateBatchScenario(scenarioIndex, modIndex, 'value', parseFloat(e.target.value))}
                            placeholder="Value"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running Batch Simulation...
                    </>
                  ) : (
                    'Run Batch Simulation'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sensitivity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                Sensitivity Analysis
              </CardTitle>
              <CardDescription>
                Understand how sensitive outcomes are to parameter changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSensitivitySubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Parameters to Analyze</Label>
                    <Select onValueChange={addSensitivityParam}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add parameter" />
                      </SelectTrigger>
                      <SelectContent>
                        {MODIFIABLE_PARAMETERS.filter(param => !sensitivityParams.includes(param)).map((param) => (
                          <SelectItem key={param} value={param}>
                            {param.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {sensitivityParams.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {sensitivityParams.map((param) => (
                          <div key={param} className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-md text-sm">
                            {param.replace('_', ' ')}
                            <button
                              type="button"
                              onClick={() => removeSensitivityParam(param)}
                              className="ml-1 text-orange-600 hover:text-orange-800"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Variation Range (±)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={variationRange}
                      onChange={(e) => setVariationRange(parseFloat(e.target.value))}
                      placeholder="0.3 = ±30%"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading || sensitivityParams.length === 0} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running Sensitivity Analysis...
                    </>
                  ) : (
                    'Run Sensitivity Analysis'
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