"use client";

import React, { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Play,
  Shield,
  Activity,
  BarChart3,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Lazy load heavy components
const FeaturesSection = dynamic(() => import('@/components/FeaturesSection'), {
  loading: () => <div className="h-96 bg-white" />,
  ssr: false
});

const CTASection = dynamic(() => import('@/components/CTASection'), {
  loading: () => <div className="h-96 bg-slate-50" />,
  ssr: false
});

export default function Home() {
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-slate-700 mr-3" />
              <h1 className="text-xl font-semibold text-slate-900">
                SkyGuard Analytics
              </h1>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              {['Features', 'Pricing', 'Documentation'].map((item) => (
                <Link 
                  key={item}
                  href={`#${item.toLowerCase()}`} 
                  className="text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors"
                >
                  {item}
                </Link>
              ))}
              <Link href="/dashboard">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                  Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-3 py-1 mb-6 text-sm bg-slate-100 text-slate-700 rounded-full">
            <Activity className="w-4 h-4 mr-2" />
            AI-Powered Weather Intelligence Platform
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Professional Weather
            <br />
            <span className="text-slate-600">Risk Assessment</span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Enterprise-grade severe weather prediction and impact analysis powered by 75 years of historical data and machine learning models.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/dashboard">
              <Button 
                size="lg" 
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3"
              >
                Access Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-3"
            >
              <Play className="mr-2 h-5 w-5" />
              View Demo
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            {[
              { 
                icon: <BarChart3 className="h-6 w-6 text-slate-700" />, 
                value: "2.3M+", 
                label: "Weather Events Analyzed" 
              },
              { 
                icon: <CheckCircle className="h-6 w-6 text-slate-700" />, 
                value: "85%", 
                label: "Prediction Accuracy" 
              },
              { 
                icon: <Activity className="h-6 w-6 text-slate-700" />, 
                value: "<200ms", 
                label: "Response Time" 
              }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-3">
                  {stat.icon}
                </div>
                <div className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Comprehensive Weather Intelligence
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Advanced analytics and forecasting tools designed for emergency management and risk assessment professionals.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Impact Analysis",
                description: "Predict property damage, casualty risk, and infrastructure impact using AI models trained on historical data.",
                icon: <BarChart3 className="h-8 w-8 text-slate-700" />
              },
              {
                title: "Risk Assessment", 
                description: "Analyze regional risk levels, compare geographic areas, and understand event-specific threat patterns.",
                icon: <Shield className="h-8 w-8 text-slate-700" />
              },
              {
                title: "Scenario Modeling",
                description: "Run 'what-if' scenarios to understand how changing parameters affect predicted outcomes.",
                icon: <Activity className="h-8 w-8 text-slate-700" />
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-lg border border-slate-200">
                <div className="mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lazy load sections */}
      <Suspense fallback={<div className="h-96 bg-white" />}>
        <FeaturesSection />
      </Suspense>

      <Suspense fallback={<div className="h-96 bg-slate-50" />}>
        <CTASection email={email} setEmail={setEmail} />
      </Suspense>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-8 md:mb-0">
              <Shield className="h-6 w-6 text-slate-700 mr-2" />
              <span className="text-lg font-semibold text-slate-900">SkyGuard Analytics</span>
            </div>
            
            <div className="flex items-center space-x-6 text-slate-600">
              {['Privacy', 'Terms', 'Documentation', 'Contact'].map((item) => (
                <Link 
                  key={item}
                  href={`/${item.toLowerCase()}`} 
                  className="hover:text-slate-900 transition-colors text-sm"
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600">
              © 2024 SkyGuard Analytics. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}