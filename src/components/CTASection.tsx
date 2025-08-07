"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Users,
  Shield,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

const CTASection: React.FC = () => {
  return (
    <section className="py-24 px-4 bg-slate-50">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-700 rounded-full mb-6 text-sm">
          <Users className="w-4 h-4 mr-2" />
          Trusted by Emergency Management Teams
        </div>
        
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
          Get Started with Professional Weather Intelligence
        </h2>
        
        <p className="text-lg text-slate-600 mb-12 max-w-2xl mx-auto">
          Join emergency management professionals who rely on SkyGuard for accurate, 
          actionable weather risk assessment and impact analysis.
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
            Schedule Demo
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-200">
          <div className="text-center">
            <Users className="h-6 w-6 text-slate-700 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-900 mb-1">500+ Agencies</div>
            <div className="text-xs text-slate-600">Trust our platform</div>
          </div>
          <div className="text-center">
            <Shield className="h-6 w-6 text-slate-700 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-900 mb-1">SOC 2 Compliant</div>
            <div className="text-xs text-slate-600">Enterprise security</div>
          </div>
          <div className="text-center">
            <CheckCircle className="h-6 w-6 text-slate-700 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-900 mb-1">99.9% Uptime</div>
            <div className="text-xs text-slate-600">Reliable service</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;