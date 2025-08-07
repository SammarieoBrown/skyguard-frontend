export interface RadarSite {
  site_id: string;
  name: string;
  location: string;
  coordinates: [number, number]; // [latitude, longitude]
  description: string;
}

export interface CoordinateMetadata {
  bounds: [number, number, number, number]; // [west, east, south, north]
  center: [number, number]; // [latitude, longitude]
  resolution_deg: number;
  resolution_km: number;
  projection: string;
  range_km: number;
}

export interface RadarDataFrame {
  timestamp: string; // ISO datetime
  data: number[][]; // 64x64 array
  coordinates: CoordinateMetadata;
  intensity_range: [number, number]; // [min, max]
  data_quality: 'good' | 'fair' | 'poor';
}

export interface RawRadarDataResponse {
  success: boolean;
  site_info: RadarSite;
  frames: RadarDataFrame[];
  total_frames: number;
  time_range: { start: string; end:string; };
}

export interface NowcastingPredictionResponse {
  success: boolean;
  site_info: RadarSite;
  prediction_frames: number[][][][]; // Shape: [6, 1, 64, 64] -> actually [6, 64, 64, 1] in docs
  prediction_timestamp: string;
}
