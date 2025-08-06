"use client";

import React from "react";
import { 
  BarChart3, 
  Shield,
  Activity,
  CloudLightning,
  TrendingUp,
} from "lucide-react";

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-700 rounded-full mb-6 text-sm">
            <Activity className="w-4 h-4 mr-2" />
            Core Capabilities
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Advanced Weather Analytics
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Professional-grade tools for comprehensive weather risk assessment and impact analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              title: "Impact Analysis",
              description: "Real-time predictions of property damage and casualty risk using AI models trained on historical data.",
              icon: <CloudLightning className="h-8 w-8 text-slate-700" />,
              metrics: [
                { label: "Response Time", value: "<200ms" },
                { label: "Accuracy Rate", value: "94.7%" }
              ]
            },
            {
              title: "Historical Analytics", 
              description: "Deep insights from 75 years of comprehensive weather data covering 2.3M+ severe weather events.",
              icon: <BarChart3 className="h-8 w-8 text-slate-700" />,
              metrics: [
                { label: "Data Span", value: "75+ Years" },
                { label: "Events Analyzed", value: "2.3M+" }
              ]
            },
            {
              title: "Risk Assessment",
              description: "County-level risk scoring with real-time updates and comprehensive geographic analysis.",
              icon: <Shield className="h-8 w-8 text-slate-700" />,
              metrics: [
                { label: "Geographic Coverage", value: "3,000+ Counties" },
                { label: "Update Frequency", value: "Real-time" }
              ]
            },
            {
              title: "Scenario Simulation",
              description: "What-if analysis with AI-powered predictions for comprehensive preparedness planning.",
              icon: <TrendingUp className="h-8 w-8 text-slate-700" />,
              metrics: [
                { label: "Available Scenarios", value: "1000+" },
                { label: "Prediction Precision", value: "95%" }
              ]
            }
          ].map((feature, index) => (
            <div key={index} className="bg-white p-8 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="mb-6">
                {feature.icon}
              </div>
              
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                {feature.title}
              </h3>
              
              <p className="text-slate-600 mb-6 leading-relaxed">
                {feature.description}
              </p>
              
              <div className="space-y-3">
                {feature.metrics.map((metric, metricIndex) => (
                  <div key={metricIndex} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">{metric.label}</span>
                    <span className="text-sm font-semibold text-slate-900">{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;