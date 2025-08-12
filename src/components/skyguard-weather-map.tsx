"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { MapContainer, TileLayer, ImageOverlay, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, RefreshCw, Play, Pause } from 'lucide-react';
import type {
  RadarSite,
  RawRadarDataResponse,
  NowcastingPredictionResponse,
  RadarDataFrame,
} from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USE_MOCK_DATA } from "@/lib/config";
import { mockDataGenerator } from "@/lib/mock-data";

// Static site data
const staticSites: RadarSite[] = [
  {
    site_id: 'KAMX',
    name: 'Miami',
    location: 'Florida, USA',
    coordinates: [25.6112, -80.4128],
    description: 'Southeast US, monitors Atlantic weather',
  },
  {
    site_id: 'KATX',
    name: 'Seattle',
    location: 'Washington, USA',
    coordinates: [48.1947, -122.4956],
    description: 'Pacific Northwest, monitors Pacific storms',
  },
];

// API Configuration
const NOWCASTING_BASE =
  "https://site--capstone-backend--4bsn7jnxdnkr.code.run/api/v1/nowcasting";

// Helper to render radar data to a canvas
function renderRadarToCanvas(
  radarData: number[][],
  intensityRange: [number, number]
): string {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  if (!intensityRange || !radarData) {
    return canvas.toDataURL();
  }

  const imageData = ctx.createImageData(64, 64);
  const [minRange, maxRange] = intensityRange;
  
  // Check if this is normalized prediction data (values between 0 and 1)
  let isNormalizedData = false;
  let maxValue = 0;
  for (let i = 0; i < radarData.length; i++) {
    for (let j = 0; j < radarData[0].length; j++) {
      maxValue = Math.max(maxValue, radarData[i][j]);
    }
  }
  isNormalizedData = maxValue <= 1.0;
  
  // Check if this is mock data (baseline at 64)
  let isMockData = false;
  if (!isNormalizedData) {
    let count64 = 0;
    for (let i = 0; i < Math.min(10, radarData.length); i++) {
      for (let j = 0; j < Math.min(10, radarData[0].length); j++) {
        if (Math.abs(radarData[i][j] - 64) < 0.01) count64++;
      }
    }
    isMockData = count64 > 50;
  }

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const value = radarData[y][x] || 0;
      const idx = (y * 64 + x) * 4;
      
      let r = 0, g = 0, b = 0, a = 0;
      let normalizedValue = 0;

      if (isNormalizedData) {
        // Prediction data: already normalized 0-1
        normalizedValue = value;
      } else if (isMockData) {
        // Mock data: 64 is baseline, normalize to 0-1
        const intensity = Math.max(0, value - 64);
        normalizedValue = intensity / 86; // 150-64 = 86 max intensity
      } else {
        // Real historical data: use intensity range
        const range = maxRange - minRange;
        if (range > 0) {
          normalizedValue = (value - minRange) / range;
        }
      }
      
      // Skip pixels with very low values (no precipitation)
      if (normalizedValue > 0.05) {
        // Standard NEXRAD color scale
        if (normalizedValue < 0.15) {
          // Light blue - light rain
          r = 0; g = 200; b = 255; a = 180;
        } else if (normalizedValue < 0.30) {
          // Blue - moderate rain
          r = 0; g = 100; b = 255; a = 200;
        } else if (normalizedValue < 0.45) {
          // Green - moderate to heavy rain
          r = 0; g = 255; b = 0; a = 220;
        } else if (normalizedValue < 0.60) {
          // Yellow - heavy rain
          r = 255; g = 255; b = 0; a = 240;
        } else if (normalizedValue < 0.75) {
          // Orange - very heavy rain
          r = 255; g = 150; b = 0; a = 250;
        } else {
          // Red - extreme precipitation
          r = 255; g = 0; b = 0; a = 255;
        }
      }

      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
      imageData.data[idx + 3] = a;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

function ChangeView({ center, zoom, shouldUpdate }: { center: L.LatLngExpression; zoom: number; shouldUpdate: boolean }) {
  const map = useMap();
  const prevShouldUpdate = useRef(shouldUpdate);
  
  useEffect(() => {
    if (shouldUpdate && !prevShouldUpdate.current) {
      map.setView(center, zoom);
    }
    prevShouldUpdate.current = shouldUpdate;
  }, [map, center, zoom, shouldUpdate]);
  
  return null;
}

export function SkyguardWeatherMap() {
  const [sites] = useState<RadarSite[]>(staticSites);
  const [selectedSite, setSelectedSite] = useState<RadarSite | null>(staticSites[0] || null);
  const [allFrames, setAllFrames] = useState<RadarDataFrame[]>([]);
  const [historicalFrameCount, setHistoricalFrameCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoursBack, setHoursBack] = useState<number | ''>(1);
  const [shouldUpdateView, setShouldUpdateView] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(500); // Animation speed in milliseconds
  const animationInterval = useRef<NodeJS.Timeout | null>(null);

  const processAndSetFrames = (radarData: RawRadarDataResponse, predictData: NowcastingPredictionResponse) => {
    if (!radarData.success || radarData.frames.length === 0) {
      throw new Error("No historical radar data available.");
    }
    
    const historicalFrames = radarData.frames;
    setHistoricalFrameCount(historicalFrames.length);

    const predictionFramesData: RadarDataFrame[] = (predictData.prediction_frames || []).map((pFrame, i) => {
      const lastHistoricalTime = new Date(predictData.prediction_timestamp);
      lastHistoricalTime.setMinutes(lastHistoricalTime.getMinutes() + (i + 1) * 10);
      
      // Convert prediction data - keep as-is for proper rendering
      const frameData = pFrame.map(row => row.map(cell => cell[0]));
      
      return {
        timestamp: lastHistoricalTime.toISOString(),
        data: frameData,
        coordinates: historicalFrames[0].coordinates,
        intensity_range: historicalFrames[0].intensity_range || [0, 150],
        data_quality: 'good',
      };
    });

    console.log('Historical frames:', historicalFrames.length);
    console.log('Prediction frames:', predictionFramesData.length);
    
    // Debug: Check data values in the first historical frame
    if (historicalFrames.length > 0) {
      const frame = historicalFrames[0].data;
      let minVal = 999, maxVal = 0, avgVal = 0, count = 0;
      for (let i = 0; i < 64; i++) {
        for (let j = 0; j < 64; j++) {
          const val = frame[i][j];
          minVal = Math.min(minVal, val);
          maxVal = Math.max(maxVal, val);
          avgVal += val;
          count++;
        }
      }
      avgVal /= count;
      console.log('First historical frame stats - Min:', minVal, 'Max:', maxVal, 'Avg:', avgVal.toFixed(2));
      console.log('Intensity range:', historicalFrames[0].intensity_range);
    }
    
    // Debug: Check prediction frame values
    if (predictionFramesData.length > 0) {
      const frame = predictionFramesData[0].data;
      let minVal = 999, maxVal = 0, avgVal = 0, count = 0;
      for (let i = 0; i < 64; i++) {
        for (let j = 0; j < 64; j++) {
          const val = frame[i][j];
          minVal = Math.min(minVal, val);
          maxVal = Math.max(maxVal, val);
          avgVal += val;
          count++;
        }
      }
      avgVal /= count;
      console.log('First prediction frame stats - Min:', minVal, 'Max:', maxVal, 'Avg:', avgVal.toFixed(2));
    }
    
    setAllFrames([...historicalFrames, ...predictionFramesData]);
    setIsPlaying(true);
  };

  const fetchDataForSite = useCallback(async (siteId: string, hours: number) => {
    if (!siteId) return;
    const site = sites.find(s => s.site_id === siteId);
    if (!site) return;

    setIsLoading(true);
    setError(null);
    setAllFrames([]);
    setFrameIndex(0);
    setIsPlaying(false);

    try {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const { radar, predict } = mockDataGenerator.generate(site, hours);
        processAndSetFrames(radar, predict);
      } else {
        console.log('Fetching radar data from:', `${NOWCASTING_BASE}/radar-data/${siteId}?hours_back=${hours}`);
        
        // Add timeout wrapper for fetch - increased to 120 seconds for initial NEXRAD downloads
        const fetchWithTimeout = (url: string, options: RequestInit, timeout = 120000) => {
          return Promise.race([
            fetch(url, options),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Request timeout after 2 minutes')), timeout)
            )
          ]) as Promise<Response>;
        };

        let radarRes: Response;
        let predictRes: Response;
        
        try {
          [radarRes, predictRes] = await Promise.all([
            fetchWithTimeout(
              `${NOWCASTING_BASE}/radar-data/${siteId}?hours_back=${hours}&max_frames=5&include_processing_metadata=false`, 
              {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                },
                mode: 'cors',
              },
              120000 // 120 second timeout for initial NEXRAD downloads
            ),
            fetchWithTimeout(
              `${NOWCASTING_BASE}/predict`, 
              {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  'Accept': 'application/json',
                },
                mode: 'cors',
                body: JSON.stringify({ 
                  site_id: siteId, 
                  use_latest_data: true, 
                  hours_back: hours || 1 
                }),
              },
              120000 // 120 second timeout for initial NEXRAD downloads
            ),
          ]);

          console.log('Radar response status:', radarRes.status);
          console.log('Predict response status:', predictRes.status);

          if (!radarRes.ok) throw new Error(`Failed to fetch radar data for ${siteId}: ${radarRes.status}`);
          if (!predictRes.ok) throw new Error(`Failed to fetch predictions for ${siteId}: ${predictRes.status}`);
          
          const radarData: RawRadarDataResponse = await radarRes.json();
          const predictData: NowcastingPredictionResponse = await predictRes.json();
          processAndSetFrames(radarData, predictData);
        } catch (fetchError) {
          console.error('Fetch error details:', fetchError);
          throw fetchError;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [sites]);

  useEffect(() => {
    if (shouldUpdateView) {
      const timer = setTimeout(() => {
        setShouldUpdateView(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldUpdateView]);

  useEffect(() => {
    if (isPlaying && allFrames.length > 1) {
      animationInterval.current = setInterval(() => {
        setFrameIndex((prevIndex) => (prevIndex + 1) % allFrames.length);
      }, animationSpeed);
    } else {
      if (animationInterval.current) {
        clearInterval(animationInterval.current);
      }
    }
    return () => {
      if (animationInterval.current) {
        clearInterval(animationInterval.current);
      }
    };
  }, [isPlaying, allFrames.length, animationSpeed]);

  const displayedFrame = allFrames[frameIndex];

  const overlay = useMemo(() => {
    if (!displayedFrame || !displayedFrame.data || !displayedFrame.intensity_range) return null;
    const imageUrl = renderRadarToCanvas(displayedFrame.data, displayedFrame.intensity_range);
    const { bounds } = displayedFrame.coordinates;
    const leafletBounds: L.LatLngBoundsExpression = [[bounds[2], bounds[0]], [bounds[3], bounds[1]]];
    return { imageUrl, leafletBounds };
  }, [displayedFrame]);

  const handleRefresh = () => {
    if (selectedSite && hoursBack !== '' && hoursBack > 0) {
      setShouldUpdateView(false);
      fetchDataForSite(selectedSite.site_id, hoursBack);
    }
  };

  const mapCenter: L.LatLngExpression = selectedSite ? [selectedSite.coordinates[0], selectedSite.coordinates[1]] : [39.8283, -98.5795];
  const mapZoom = selectedSite ? 9 : 4;



  return (
    <Card>
      <CardHeader className="relative z-20">
        <CardTitle>Weather Radar</CardTitle>
        <div className="flex flex-col sm:flex-row items-end gap-4 mt-4">
          <div className="grid w-full sm:w-auto flex-1 sm:flex-initial items-center gap-1.5">
            <Label>Radar Site</Label>
            <Select onValueChange={(siteId) => {
              setSelectedSite(sites.find((s) => s.site_id === siteId) || null);
              setShouldUpdateView(true);
            }} value={selectedSite?.site_id} disabled={sites.length === 0}>
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Select Radar Site..." /></SelectTrigger>
              <SelectContent style={{ zIndex: 9999 }}>
                {sites.map((site) => (<SelectItem key={site.site_id} value={site.site_id}>{site.name} ({site.site_id})</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid w-full sm:w-[180px] items-center gap-1.5">
            <Label>Hours Back</Label>
            <Input type="number" value={hoursBack} onChange={(e) => setHoursBack(e.target.value ? parseInt(e.target.value, 10) : '')} placeholder="e.g., 1" min="1" disabled={!selectedSite}/>
          </div>
          <Button onClick={handleRefresh} disabled={isLoading || !selectedSite}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="h-[400px] md:h-[600px] w-full bg-muted rounded-md overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-white" />
                <div className="text-white text-center">
                  <p className="font-semibold">Loading radar data...</p>
                  <p className="text-sm opacity-90">First-time downloads may take up to 2 minutes</p>
                </div>
              </div>
            </div>
          )}
          <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
            <ChangeView center={mapCenter} zoom={mapZoom} shouldUpdate={shouldUpdateView} />
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {overlay && (<ImageOverlay url={overlay.imageUrl} bounds={overlay.leafletBounds} opacity={0.7} />)}
          </MapContainer>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <div className="w-full flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setIsPlaying(!isPlaying)} disabled={allFrames.length === 0}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
          </Button>
          <div className="w-full">

            <Slider min={0} max={allFrames.length > 0 ? allFrames.length - 1 : 0} step={1} value={[frameIndex]} onValueChange={(value) => setFrameIndex(value[0])} disabled={allFrames.length === 0 || isLoading} />
          </div>
        </div>
        <div className="w-full flex items-center gap-4">
          <Label className="text-sm font-medium whitespace-nowrap">Animation Speed:</Label>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-foreground">Fast</span>
            <Slider 
              min={100} 
              max={2000} 
              step={100} 
              value={[animationSpeed]} 
              onValueChange={(value) => setAnimationSpeed(value[0])} 
              disabled={allFrames.length === 0} 
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground">Slow</span>
          </div>
          <span className="text-sm font-medium ml-2">{animationSpeed}ms</span>
        </div>
        {error && (
          <div className="w-full p-3 text-destructive border border-destructive/50 bg-destructive/10 rounded-md">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
              <div><p className="font-bold">Error Fetching Data</p><p className="text-sm">{`The backend responded with an error: ${error}`}</p></div>
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground w-full text-center">
          {displayedFrame ? `Data timestamp: ${new Date(displayedFrame.timestamp).toLocaleString()}` : "Select a site and press Refresh to view data."}
        </p>
      </CardFooter>
    </Card>
  );
}
