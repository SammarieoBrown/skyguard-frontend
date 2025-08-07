"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const SkyguardWeatherMap = dynamic(
  () => import('@/components/skyguard-weather-map').then(mod => mod.SkyguardWeatherMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);

export default function RadarForecastNowcasting() {
  return <SkyguardWeatherMap />;
}