# Nowcasting API Frontend Integration Guide

This guide provides comprehensive documentation for integrating with the SkyGuard Analytics Nowcasting API endpoints. All endpoints are designed for real-time weather radar data processing and visualization.

## Base URL
```
http://localhost:8000/api/v1/nowcasting
```

## Supported Radar Sites
- **KAMX** - Miami, FL (25.6112, -80.4128)
- **KATX** - Seattle, WA (48.1947, -122.4956)

---

## 🎯 **Core Weather Prediction Endpoints**

### 1. **POST** `/predict` - Predict Weather Nowcast

Generates 6-frame precipitation predictions based on latest radar data.

**Request Schema:**
```typescript
interface NowcastingPredictionRequest {
  site_id: "KAMX" | "KATX";                    // Required: Radar site
  use_latest_data?: boolean;                   // Default: true
  hours_back?: number;                         // 1-48, Default: 12
  custom_radar_data?: number[][][][];          // Optional: (10,64,64,1) array
}
```

**Example Request:**
```javascript
const response = await fetch('/api/v1/nowcasting/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    site_id: "KAMX",
    use_latest_data: true,
    hours_back: 6
  })
});
```

**Response Schema:**
```typescript
interface NowcastingPredictionResponse {
  success: boolean;
  site_info: {
    site_id: string;
    name: string;
    location: string;
    coordinates: [number, number];             // [lat, lon]
    description: string;
  };
  prediction_frames: number[][][][];          // 6 future frames (6,64,64,1)
  input_metadata: {
    data_source: "nexrad_gcp" | "custom";
    files_used?: number;
    processing_metadata?: object;
  };
  ml_model_metadata: object;
  processing_time_ms: number;
  prediction_timestamp: string;               // ISO datetime
  frame_times: string[];                      // 6 future timestamps
  confidence_metrics?: Record<string, number>;
}
```

**Usage:**
- Perfect for **weather forecasting dashboards**
- Returns **6 future radar frames** (10-minute intervals)
- Use `prediction_frames` for animated weather predictions

---

### 2. **POST** `/batch` - Batch Weather Nowcast

Generate predictions for multiple radar sites simultaneously.

**Request Schema:**
```typescript
interface BatchNowcastingRequest {
  site_ids: ("KAMX" | "KATX")[];             // Array of site IDs
  hours_back?: number;                       // 1-48, Default: 12
}
```

**Example Request:**
```javascript
const response = await fetch('/api/v1/nowcasting/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    site_ids: ["KAMX", "KATX"],
    hours_back: 6
  })
});
```

**Response Schema:**
```typescript
interface BatchNowcastingResponse {
  success: boolean;
  predictions: Record<string, NowcastingPredictionResponse | {
    error: string;
    status: "failed";
  }>;
  total_sites: number;
  successful_sites: number;
  failed_sites: number;
  total_processing_time_ms: number;
  batch_timestamp: string;
}
```

**Usage:**
- **Multi-site weather dashboards**
- Compare predictions across different regions
- Handle partial failures gracefully

---

## 🗺️ **Raw Radar Data Endpoints (Frontend Integration)**

### 3. **GET** `/radar-data/{site_id}` - Get Raw Radar Data

**🎯 PRIMARY ENDPOINT FOR FRONTEND MAP INTEGRATION**

Returns raw radar data arrays with geographic coordinates for direct map rendering.

**Query Parameters:**
```typescript
interface RadarDataParams {
  hours_back?: number;                       // Default: 6, Max: 48
  max_frames?: number;                       // Default: 20, Max: 50
  include_processing_metadata?: boolean;     // Default: false
}
```

**Example Request:**
```javascript
const siteId = "KAMX";
const params = new URLSearchParams({
  hours_back: "6",
  max_frames: "10",
  include_processing_metadata: "false"
});

const response = await fetch(`/api/v1/nowcasting/radar-data/${siteId}?${params}`);
const data = await response.json();
```

**Response Schema:**
```typescript
interface RawRadarDataResponse {
  success: boolean;
  site_info: {
    site_id: string;
    name: string;
    location: string;
    coordinates: [number, number];           // [lat, lon]
    description: string;
  };
  frames: RadarDataFrame[];
  total_frames: number;
  time_range: {
    start: string;                          // ISO datetime
    end: string;                            // ISO datetime
  };
  processing_time_ms: number;
  cache_performance?: {
    cache_hits: number;
    cache_misses: number;
    processing_errors: string[];
  };
  request_timestamp: string;
}

interface RadarDataFrame {
  timestamp: string;                        // ISO datetime
  data: number[][];                         // 64x64 array of radar values (0-255)
  coordinates: {
    bounds: [number, number, number, number]; // [west, east, south, north]
    center: [number, number];               // [lat, lon]
    resolution_deg: number;                 // Degrees per pixel
    resolution_km: number;                  // Km per pixel
    projection: "PlateCarree";
    range_km: number;                       // Usually 150
  };
  intensity_range: [number, number];        // [min, max] values in data
  data_quality: "good" | "fair" | "poor";
  processing_metadata?: {
    file_path: string;
    file_size_bytes: number;
    coverage_ratio: number;
    non_zero_pixels: number;
    data_shape: [number, number];
  };
}
```

**Frontend Integration Example:**
```javascript
// Fetch radar data
const response = await fetch('/api/v1/nowcasting/radar-data/KAMX?max_frames=5');
const radarData = await response.json();

// Use with Leaflet
radarData.frames.forEach(frame => {
  const bounds = frame.coordinates.bounds;
  const leafletBounds = L.latLngBounds(
    [bounds[2], bounds[0]], // southwest
    [bounds[3], bounds[1]]  // northeast
  );
  
  // Create custom overlay
  const overlay = L.imageOverlay(
    convertDataToImageURL(frame.data), 
    leafletBounds
  ).addTo(map);
});

// Use with Mapbox GL JS
radarData.frames.forEach(frame => {
  map.addSource(`radar-${frame.timestamp}`, {
    type: 'image',
    url: convertDataToImageURL(frame.data),
    coordinates: [
      [frame.coordinates.bounds[0], frame.coordinates.bounds[3]], // top-left
      [frame.coordinates.bounds[1], frame.coordinates.bounds[3]], // top-right
      [frame.coordinates.bounds[1], frame.coordinates.bounds[2]], // bottom-right
      [frame.coordinates.bounds[0], frame.coordinates.bounds[2]]  // bottom-left
    ]
  });
});
```

---

### 4. **GET** `/radar-timeseries/{site_id}` - Get Radar Timeseries

Get radar data for a specific time range - perfect for historical analysis.

**Query Parameters:**
```typescript
interface TimeSeriesParams {
  start_time: string;                       // ISO datetime (required)
  end_time: string;                         // ISO datetime (required)
  max_frames?: number;                      // Default: 50, Max: 200
  include_processing_metadata?: boolean;    // Default: false
}
```

**Example Request:**
```javascript
const params = new URLSearchParams({
  start_time: "2025-08-02T16:00:00",
  end_time: "2025-08-02T19:00:00",
  max_frames: "20"
});

const response = await fetch(`/api/v1/nowcasting/radar-timeseries/KAMX?${params}`);
```

**Response Schema:**
```typescript
interface TimeSeriesRadarResponse {
  success: boolean;
  site_info: SiteInfo;
  frames: RadarDataFrame[];                 // Time-ordered frames
  total_frames: number;
  time_range: {                            // Requested range
    start: string;
    end: string;
  };
  actual_time_range: {                     // Actual data range
    start: string;
    end: string;
  };
  temporal_resolution_minutes: number;      // Average time between frames
  data_completeness: number;               // 0-1, percentage of time range covered
  processing_time_ms: number;
  request_timestamp: string;
}
```

**Usage:**
- **Historical weather analysis**
- **Time-lapse animations**
- **Weather event studies**

---

### 5. **GET** `/radar-data/multi-site` - Get Multi Site Radar Data

Get radar data from multiple sites for composite visualizations.

**Query Parameters:**
```typescript
interface MultiSiteParams {
  site_ids: string;                        // Comma-separated: "KAMX,KATX"
  hours_back?: number;                     // Default: 6
  max_frames_per_site?: number;            // Default: 10
}
```

**Example Request:**
```javascript
const params = new URLSearchParams({
  site_ids: "KAMX,KATX",
  hours_back: "6",
  max_frames_per_site: "5"
});

const response = await fetch(`/api/v1/nowcasting/radar-data/multi-site?${params}`);
```

**Response Schema:**
```typescript
interface MultiSiteRadarResponse {
  success: boolean;
  site_data: Record<string, RawRadarDataResponse>; // Keyed by site_id
  successful_sites: number;
  failed_sites: number;
  total_sites: number;
  composite_bounds?: {                     // Combined geographic bounds
    bounds: [number, number, number, number];
    center: [number, number];
    resolution_deg: number;
    resolution_km: number;
    projection: string;
    range_km: number;
    coverage_sites: string[];
  };
  processing_time_ms: number;
  request_timestamp: string;
}
```

**Usage:**
- **National/regional weather maps**
- **Multi-site radar composites**
- **Cross-regional weather analysis**

---

### 6. **GET** `/radar-frame/{site_id}` - Get Single Radar Frame

Get a single radar frame, either latest or for a specific timestamp.

**Query Parameters:**
```typescript
interface RadarFrameParams {
  timestamp?: string;                      // ISO datetime (optional, defaults to latest)
  include_processing_metadata?: boolean;   // Default: false
}
```

**Example Requests:**
```javascript
// Get latest frame
const latest = await fetch('/api/v1/nowcasting/radar-frame/KAMX');

// Get specific timestamp
const params = new URLSearchParams({
  timestamp: "2025-08-02T18:00:00",
  include_processing_metadata: "true"
});
const specific = await fetch(`/api/v1/nowcasting/radar-frame/KAMX?${params}`);
```

**Response Schema:**
```typescript
// Returns a single RadarDataFrame (same as in radar-data frames array)
interface RadarDataFrame {
  timestamp: string;
  data: number[][];                        // 64x64 array
  coordinates: CoordinateMetadata;
  intensity_range: [number, number];
  data_quality: "good" | "fair" | "poor";
  processing_metadata?: ProcessingMetadata;
}
```

**Usage:**
- **Real-time current conditions**
- **Specific moment analysis**
- **Quick data previews**

---

## 📊 **Status and Information Endpoints**

### 7. **GET** `/current-conditions/{site_id}` - Get Current Radar Conditions

Get current radar conditions and data availability.

**Response Schema:**
```typescript
interface CurrentRadarConditionsResponse {
  site_info: SiteInfo;
  latest_data_time?: string;               // ISO datetime
  data_freshness_hours?: number;           // Hours since latest data
  available_frames: number;
  data_quality: "excellent" | "good" | "fair" | "poor" | "no_data";
  coverage_area_km: number;                // Usually 150
  last_updated: string;                    // ISO datetime
}
```

**Usage:**
- **System health dashboards**
- **Data availability checks**
- **Quality monitoring**

---

### 8. **GET** `/sites` - Get Supported Sites

Get list of supported radar sites.

**Response Schema:**
```typescript
interface RadarSiteInfo {
  site_id: string;
  name: string;
  location: string;
  coordinates: [number, number];           // [lat, lon]
  description: string;
}

// Returns: RadarSiteInfo[]
```

**Usage:**
- **Site selection dropdowns**
- **Map initialization**
- **Feature discovery**

---

### 9. **GET** `/health` - Get Nowcasting Health

Get health status of the weather nowcasting system.

**Response Schema:**
```typescript
interface ModelHealthResponse {
  ml_model_name: string;
  is_loaded: boolean;
  ml_model_status: string;
  ml_model_info: Record<string, any>;
  health_check_time: string;
  last_prediction?: string;
  performance_metrics?: Record<string, number>;
}
```

---

### 10. **GET** `/data-status` - Get Data Pipeline Status

Get comprehensive status of data pipeline and processing services.

**Response Schema:**
```typescript
interface DataPipelineStatus {
  service_name: string;
  status: string;
  last_update: string;
  supported_sites: string[];
  site_status: Record<string, {
    directory_exists: boolean;
    available_dates: string[];
    total_files: number;
    total_size_mb: number;
  }>;
  storage_info: Record<string, any>;
  health_checks: Record<string, any>;
}
```

---

## 🔧 **Management Endpoints**

### 11. **POST** `/refresh-data` - Refresh Radar Data

Manually trigger refresh of radar data for specified sites.

**Request Schema:**
```typescript
interface DataRefreshRequest {
  site_ids?: string[];                     // Optional: specific sites, default: all
  hours_back?: number;                     // 1-24, Default: 6
  force_refresh?: boolean;                 // Default: false
}
```

**Response Schema:**
```typescript
interface DataRefreshResponse {
  success: boolean;
  sites_refreshed: string[];
  refresh_results: Record<string, any>;
  total_files_downloaded: number;
  total_processing_time_s: number;
  refresh_timestamp: string;
}
```

---

### 12. **POST** `/warm-cache` - Warm Cache For Site

Pre-load cache with recent radar data for faster predictions.

**Query Parameters:**
```typescript
interface WarmCacheParams {
  site_id: string;                         // Required in URL path
  hours_back?: number;                     // Default: 6
}
```

---

### 13. **GET** `/cache-stats` - Get Cache Statistics

Get cache performance statistics.

**Response Schema:**
```typescript
interface CacheStats {
  service: string;
  cache_enabled: boolean;
  cache_stats?: {
    hits: number;
    misses: number;
    hit_rate: number;
  };
}
```

---

## 🖼️ **Visualization Endpoints (Legacy - Use Raw Data Instead)**

### 14. **GET** `/visualization/{site_id}` - Get Radar Visualization

⚠️ **Deprecated for frontend use** - Returns PNG image instead of data arrays.

**Response:** PNG image file

**Usage:** Use `/radar-data/{site_id}` instead for frontend integration.

---

### 15. **GET** `/mosaic` - Get Radar Mosaic

⚠️ **Deprecated for frontend use** - Returns composite PNG image.

**Response:** PNG image file

**Usage:** Use `/radar-data/multi-site` instead for frontend integration.

---

### 16. **GET** `/mosaic/info` - Get Mosaic Info

Get information about radar mosaic service capabilities.

**Response Schema:**
```typescript
interface MosaicServiceInfo {
  service: string;
  supported_sites: string[];
  site_details: Record<string, SiteInfo>;
  capabilities: string[];
  output_formats: string[];
  projections: string[];
  colormap: string;
}
```

---

## 🚀 **Frontend Integration Best Practices**

### **For Real-Time Weather Maps:**
1. Use `/radar-data/{site_id}` for current conditions
2. Use `/radar-frame/{site_id}` for quick updates
3. Implement polling every 5-10 minutes for live data

### **For Historical Analysis:**
1. Use `/radar-timeseries/{site_id}` with specific date ranges
2. Set appropriate `max_frames` to avoid large responses
3. Check `data_completeness` for data quality assessment

### **For Multi-Site Dashboards:**
1. Use `/radar-data/multi-site` for composite views
2. Handle partial failures gracefully
3. Use `composite_bounds` for map centering

### **Performance Tips:**
1. Enable caching with `/warm-cache` for frequently accessed sites
2. Use `max_frames` parameter to limit response size
3. Monitor `/cache-stats` for performance optimization

### **Error Handling:**
```javascript
const response = await fetch('/api/v1/nowcasting/radar-data/KAMX');

if (!response.ok) {
  const error = await response.json();
  console.error('API Error:', error.detail);
  return;
}

const data = await response.json();
if (!data.success) {
  console.error('Request failed:', data);
  return;
}

// Process successful response
processRadarData(data);
```

### **TypeScript Integration:**
```typescript
// Define types
import type { 
  RawRadarDataResponse, 
  RadarDataFrame, 
  TimeSeriesRadarResponse 
} from './types/nowcasting';

// Use with proper typing
const fetchRadarData = async (siteId: string): Promise<RawRadarDataResponse | null> => {
  try {
    const response = await fetch(`/api/v1/nowcasting/radar-data/${siteId}`);
    if (!response.ok) return null;
    
    const data: RawRadarDataResponse = await response.json();
    return data.success ? data : null;
  } catch (error) {
    console.error('Failed to fetch radar data:', error);
    return null;
  }
};
```

This guide provides everything needed for robust frontend integration with the SkyGuard Analytics Nowcasting API. Focus on the raw radar data endpoints (`/radar-data/*`) for modern web applications that need direct data manipulation and custom visualizations.