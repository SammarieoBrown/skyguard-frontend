import type { RawRadarDataResponse, NowcastingPredictionResponse, RadarSite } from './types';

// --- 1. Deterministic PRNG and Seeding ---
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

class SeededRNG {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  uniform(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  uniformInt(min: number, max: number): number {
    return Math.floor(this.uniform(min, max + 1));
  }
  normal(mean: number, std: number): number {
    const u = 1 - this.next();
    const v = this.next();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + z * std;
  }
  choice<T>(arr: T[]): T {
    return arr[this.uniformInt(0, arr.length - 1)];
  }
  poisson(lambda: number): number {
    const L = Math.exp(-lambda);
    let p = 1;
    let k = 0;
    do {
      k++;
      p *= this.next();
    } while (p > L);
    return k - 1;
  }
}

// --- 2. Enhanced Types and Interfaces ---
type RegionType = 'tropical' | 'temperate';
type StructureType = 'circular' | 'linear' | 'cluster' | 'banded' | 'supercell' | 'squall_line';
type LifecycleStage = 'developing' | 'mature' | 'dissipating' | 'steady';

interface RegionProfile {
  type: RegionType;
  stormIntensity: [number, number];
  movement: {
    speed: [number, number]; // km/h
    direction: [number, number]; // degrees
  };
  convectiveInstability: number; // 0-1
  shearStrength: number; // 0-1
}

interface MotionVector {
  u: number; // eastward velocity (km/h)
  v: number; // northward velocity (km/h)
  confidence: number; // 0-1
}

interface WeatherFeature {
  id: string;
  initialX: number;
  initialY: number;
  maxIntensity: number;
  currentIntensity: number;
  size: number;
  eccentricity: number;
  orientation: number; // degrees
  velocityX: number;
  velocityY: number;
  birthTime: number;
  peakTime: number;
  deathTime: number;
  structure: StructureType;
  stage: LifecycleStage;
  growthRate: number;
  areaChange: number;
  rotationRate: number;
  convectiveDepth: number;
  subCells?: { offsetX: number; offsetY: number; intensityFactor: number }[];
  history: { time: number; x: number; y: number; intensity: number; area: number }[];
}

interface PredictionFrame {
  leadTime: number; // minutes
  timestamp: string;
  data: number[][];
  uncertainty: number[][]; // uncertainty at each grid point
  confidence: number; // overall confidence 0-1
  ensembleSpread?: number[][];
}

// --- 3. Motion Analysis and Optical Flow ---
class OpticalFlow {
  private pyramidLevels = 3;
  private searchRadius = 5;
  
  analyzeMotion(frame1: number[][], frame2: number[][], timeIntervalHours: number): MotionVector[][] {
    const motionField: MotionVector[][] = Array(64).fill(0).map(() => 
      Array(64).fill(0).map(() => ({ u: 0, v: 0, confidence: 0 }))
    );
    
    if (!frame1 || !frame2) return motionField;
    
    // Multi-scale pyramid approach
    for (let level = this.pyramidLevels; level >= 0; level--) {
      const scale = Math.pow(2, level);
      const scaled1 = this.downsample(frame1, scale);
      const scaled2 = this.downsample(frame2, scale);
      
      for (let i = 0; i < scaled1.length; i++) {
        for (let j = 0; j < scaled1[0].length; j++) {
          if (scaled1[i][j] > 70) { // Only track precipitation
            const match = this.findBestMatch(scaled1, scaled2, i, j, this.searchRadius * scale);
            if (match.confidence > 0.5) {
              const gridI = Math.min(i * scale, 63);
              const gridJ = Math.min(j * scale, 63);
              motionField[gridI][gridJ] = {
                u: match.dx / timeIntervalHours,
                v: match.dy / timeIntervalHours,
                confidence: match.confidence
              };
            }
          }
        }
      }
    }
    
    // Smooth motion field
    return this.smoothMotionField(motionField);
  }
  
  private downsample(frame: number[][], scale: number): number[][] {
    const newSize = Math.ceil(64 / scale);
    const result: number[][] = Array(newSize).fill(0).map(() => Array(newSize).fill(0));
    
    for (let i = 0; i < newSize; i++) {
      for (let j = 0; j < newSize; j++) {
        let sum = 0;
        let count = 0;
        for (let di = 0; di < scale; di++) {
          for (let dj = 0; dj < scale; dj++) {
            const oi = Math.min(i * scale + di, 63);
            const oj = Math.min(j * scale + dj, 63);
            sum += frame[oi][oj];
            count++;
          }
        }
        result[i][j] = sum / count;
      }
    }
    return result;
  }
  
  private findBestMatch(frame1: number[][], frame2: number[][], i: number, j: number, searchRadius: number) {
    let bestMatch = { dx: 0, dy: 0, confidence: 0 };
    let minError = Infinity;
    
    const windowSize = 3;
    const patch1 = this.extractPatch(frame1, i, j, windowSize);
    
    for (let di = -searchRadius; di <= searchRadius; di++) {
      for (let dj = -searchRadius; dj <= searchRadius; dj++) {
        const ni = i + di;
        const nj = j + dj;
        
        if (ni >= 0 && ni < frame2.length && nj >= 0 && nj < frame2[0].length) {
          const patch2 = this.extractPatch(frame2, ni, nj, windowSize);
          const error = this.calculatePatchError(patch1, patch2);
          
          if (error < minError) {
            minError = error;
            bestMatch = { dx: dj * 4.6875, dy: -di * 4.6875, confidence: 1 / (1 + error / 100) };
          }
        }
      }
    }
    
    return bestMatch;
  }
  
  private extractPatch(frame: number[][], i: number, j: number, size: number): number[][] {
    const patch: number[][] = [];
    for (let di = -size; di <= size; di++) {
      const row: number[] = [];
      for (let dj = -size; dj <= size; dj++) {
        const ni = Math.max(0, Math.min(frame.length - 1, i + di));
        const nj = Math.max(0, Math.min(frame[0].length - 1, j + dj));
        row.push(frame[ni][nj]);
      }
      patch.push(row);
    }
    return patch;
  }
  
  private calculatePatchError(patch1: number[][], patch2: number[][]): number {
    let error = 0;
    for (let i = 0; i < patch1.length; i++) {
      for (let j = 0; j < patch1[0].length; j++) {
        error += Math.pow(patch1[i][j] - patch2[i][j], 2);
      }
    }
    return error / (patch1.length * patch1[0].length);
  }
  
  private smoothMotionField(field: MotionVector[][]): MotionVector[][] {
    const smoothed: MotionVector[][] = Array(64).fill(0).map(() => 
      Array(64).fill(0).map(() => ({ u: 0, v: 0, confidence: 0 }))
    );
    
    const kernel = [
      [0.0625, 0.125, 0.0625],
      [0.125, 0.25, 0.125],
      [0.0625, 0.125, 0.0625]
    ];
    
    for (let i = 1; i < 63; i++) {
      for (let j = 1; j < 63; j++) {
        let u = 0, v = 0, confidence = 0;
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const weight = kernel[di + 1][dj + 1];
            u += field[i + di][j + dj].u * weight;
            v += field[i + di][j + dj].v * weight;
            confidence += field[i + di][j + dj].confidence * weight;
          }
        }
        smoothed[i][j] = { u, v, confidence };
      }
    }
    
    return smoothed;
  }
}

// --- 4. Feature Extraction and Tracking ---
class FeatureTracker {
  extractFeatures(frame: number[][], rng: SeededRNG, timestamp: number): WeatherFeature[] {
    const features: WeatherFeature[] = [];
    const regions = this.identifyRegions(frame, 70);
    
    for (const region of regions) {
      if (region.pixels.length < 5) continue; // Skip tiny features
      
      const feature = this.analyzeRegion(region, rng, timestamp);
      features.push(feature);
    }
    
    return features;
  }
  
  private identifyRegions(frame: number[][], threshold: number) {
    const visited = Array(64).fill(0).map(() => Array(64).fill(false));
    const regions: { pixels: [number, number][]; values: number[] }[] = [];
    
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) {
        if (!visited[i][j] && frame[i][j] > threshold) {
          const region = this.floodFill(frame, visited, i, j, threshold);
          if (region.pixels.length > 0) {
            regions.push(region);
          }
        }
      }
    }
    
    return regions;
  }
  
  private floodFill(frame: number[][], visited: boolean[][], startI: number, startJ: number, threshold: number) {
    const pixels: [number, number][] = [];
    const values: number[] = [];
    const stack: [number, number][] = [[startI, startJ]];
    
    while (stack.length > 0) {
      const [i, j] = stack.pop()!;
      
      if (i < 0 || i >= 64 || j < 0 || j >= 64 || visited[i][j] || frame[i][j] <= threshold) {
        continue;
      }
      
      visited[i][j] = true;
      pixels.push([i, j]);
      values.push(frame[i][j]);
      
      stack.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
    }
    
    return { pixels, values };
  }
  
  private analyzeRegion(region: { pixels: [number, number][]; values: number[] }, rng: SeededRNG, timestamp: number): WeatherFeature {
    const centroid = this.calculateCentroid(region.pixels);
    const maxIntensity = Math.max(...region.values);
    const meanIntensity = region.values.reduce((a, b) => a + b, 0) / region.values.length;
    const area = region.pixels.length;
    
    const { eccentricity, orientation } = this.calculateShape(region.pixels, centroid);
    const structure = this.classifyStructure(eccentricity, area, rng);
    const stage = this.determineStage(meanIntensity, maxIntensity, area);
    
    return {
      id: `feature-${timestamp}-${Math.floor(centroid[0])}-${Math.floor(centroid[1])}`,
      initialX: (centroid[1] - 31.5) * 4.6875,
      initialY: (31.5 - centroid[0]) * 4.6875,
      maxIntensity,
      currentIntensity: meanIntensity,
      size: Math.sqrt(area) * 4.6875,
      eccentricity,
      orientation,
      velocityX: 0,
      velocityY: 0,
      birthTime: timestamp - 2 * 3600 * 1000,
      peakTime: timestamp + rng.uniform(0, 2) * 3600 * 1000,
      deathTime: timestamp + rng.uniform(2, 6) * 3600 * 1000,
      structure,
      stage,
      growthRate: stage === 'developing' ? 0.2 : stage === 'dissipating' ? -0.1 : 0,
      areaChange: stage === 'developing' ? 0.15 : stage === 'dissipating' ? -0.15 : 0,
      rotationRate: structure === 'supercell' ? rng.uniform(0.1, 0.3) : 0,
      convectiveDepth: meanIntensity / 150,
      subCells: structure === 'cluster' ? this.generateSubCells(rng) : undefined,
      history: [{ time: timestamp, x: centroid[1], y: centroid[0], intensity: meanIntensity, area }]
    };
  }
  
  private calculateCentroid(pixels: [number, number][]): [number, number] {
    let sumI = 0, sumJ = 0;
    for (const [i, j] of pixels) {
      sumI += i;
      sumJ += j;
    }
    return [sumI / pixels.length, sumJ / pixels.length];
  }
  
  private calculateShape(pixels: [number, number][], centroid: [number, number]) {
    let sumXX = 0, sumYY = 0, sumXY = 0;
    
    for (const [i, j] of pixels) {
      const dx = j - centroid[1];
      const dy = i - centroid[0];
      sumXX += dx * dx;
      sumYY += dy * dy;
      sumXY += dx * dy;
    }
    
    const n = pixels.length;
    sumXX /= n;
    sumYY /= n;
    sumXY /= n;
    
    const trace = sumXX + sumYY;
    const det = sumXX * sumYY - sumXY * sumXY;
    const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det));
    
    const lambda1 = (trace + disc) / 2;
    const lambda2 = (trace - disc) / 2;
    
    const eccentricity = lambda2 > 0 ? Math.sqrt(1 - lambda2 / lambda1) : 1;
    const orientation = Math.atan2(2 * sumXY, sumXX - sumYY) * 180 / Math.PI / 2;
    
    return { eccentricity, orientation };
  }
  
  private classifyStructure(eccentricity: number, area: number, rng: SeededRNG): StructureType {
    if (eccentricity > 0.8 && area > 50) return 'squall_line';
    if (eccentricity > 0.7) return 'linear';
    if (area > 100 && rng.next() > 0.7) return 'supercell';
    if (area > 30 && rng.next() > 0.5) return 'cluster';
    if (rng.next() > 0.6) return 'banded';
    return 'circular';
  }
  
  private determineStage(meanIntensity: number, maxIntensity: number, area: number): LifecycleStage {
    const intensityRatio = meanIntensity / maxIntensity;
    
    if (intensityRatio > 0.8 && maxIntensity > 100) return 'mature';
    if (intensityRatio < 0.6 && area < 20) return 'dissipating';
    if (maxIntensity > 80 && area > 15) return 'developing';
    return 'steady';
  }
  
  private generateSubCells(rng: SeededRNG) {
    return Array.from({ length: rng.uniformInt(3, 5) }, () => ({
      offsetX: rng.uniform(-20, 20),
      offsetY: rng.uniform(-20, 20),
      intensityFactor: rng.uniform(0.5, 1.0)
    }));
  }
}

// --- 5. Prediction Algorithms ---
class WeatherPredictor {
  private opticalFlow = new OpticalFlow();
  private featureTracker = new FeatureTracker();
  
  generatePredictions(
    historicalFrames: { timestamp: string; data: number[][] }[],
    predictionHours: number,
    intervalMinutes: number,
    rng: SeededRNG,
    profile: RegionProfile
  ): PredictionFrame[] {
    const predictions: PredictionFrame[] = [];
    const currentFrame = historicalFrames[historicalFrames.length - 1];
    const currentTime = new Date(currentFrame.timestamp).getTime();
    
    // Analyze motion from recent frames
    const motionField = this.analyzeRecentMotion(historicalFrames);
    
    // Extract features from current state
    const features = this.featureTracker.extractFeatures(currentFrame.data, rng, currentTime);
    
    // Generate predictions at specified intervals
    for (let minutes = intervalMinutes; minutes <= predictionHours * 60; minutes += intervalMinutes) {
      const leadTime = minutes;
      const timestamp = new Date(currentTime + minutes * 60 * 1000);
      
      let frame: number[][];
      let uncertainty: number[][];
      let confidence: number;
      
      if (leadTime <= 120) { // 0-2 hours: Nowcasting
        const result = this.nowcastPrediction(currentFrame.data, motionField, leadTime);
        frame = result.frame;
        uncertainty = result.uncertainty;
        confidence = 1.0 - 0.1 * (leadTime / 120);
      } else if (leadTime <= 360) { // 2-6 hours: Blended
        const result = this.blendedPrediction(currentFrame.data, features, motionField, leadTime, rng, profile);
        frame = result.frame;
        uncertainty = result.uncertainty;
        confidence = 0.9 - 0.3 * ((leadTime - 120) / 240);
      } else { // 6+ hours: Model-based
        const result = this.modelBasedPrediction(features, historicalFrames, leadTime, rng);
        frame = result.frame;
        uncertainty = result.uncertainty;
        confidence = 0.6 - 0.4 * Math.min(1, (leadTime - 360) / 360);
      }
      
      // Apply ensemble uncertainty
      const ensembleResult = this.applyEnsembleUncertainty(frame, 1 - confidence, leadTime, rng);
      
      predictions.push({
        leadTime,
        timestamp: timestamp.toISOString(),
        data: ensembleResult.frame,
        uncertainty: ensembleResult.uncertainty,
        confidence,
        ensembleSpread: ensembleResult.spread
      });
    }
    
    return predictions;
  }
  
  private analyzeRecentMotion(frames: { timestamp: string; data: number[][] }[]): MotionVector[][] {
    if (frames.length < 2) {
      return Array(64).fill(0).map(() => 
        Array(64).fill(0).map(() => ({ u: 0, v: 0, confidence: 0 }))
      );
    }
    
    const frame1 = frames[frames.length - 2];
    const frame2 = frames[frames.length - 1];
    const timeInterval = (new Date(frame2.timestamp).getTime() - new Date(frame1.timestamp).getTime()) / (3600 * 1000);
    
    return this.opticalFlow.analyzeMotion(frame1.data, frame2.data, timeInterval);
  }
  
  private nowcastPrediction(
    currentFrame: number[][],
    motionField: MotionVector[][],
    leadTimeMinutes: number
  ): { frame: number[][]; uncertainty: number[][] } {
    const frame = Array(64).fill(0).map(() => Array(64).fill(64));
    const uncertainty = Array(64).fill(0).map(() => Array(64).fill(0));
    
    // Semi-Lagrangian advection
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) {
        const motion = motionField[i][j];
        const displacement = {
          x: motion.u * (leadTimeMinutes / 60) / 4.6875,
          y: -motion.v * (leadTimeMinutes / 60) / 4.6875
        };
        
        // Backward trajectory
        const sourceI = i + displacement.y;
        const sourceJ = j - displacement.x;
        
        if (sourceI >= 0 && sourceI < 63 && sourceJ >= 0 && sourceJ < 63) {
          // Bilinear interpolation
          const i0 = Math.floor(sourceI);
          const i1 = Math.min(i0 + 1, 63);
          const j0 = Math.floor(sourceJ);
          const j1 = Math.min(j0 + 1, 63);
          
          const di = sourceI - i0;
          const dj = sourceJ - j0;
          
          const value = (1 - di) * (1 - dj) * currentFrame[i0][j0] +
                       di * (1 - dj) * currentFrame[i1][j0] +
                       (1 - di) * dj * currentFrame[i0][j1] +
                       di * dj * currentFrame[i1][j1];
          
          // Apply decay based on lead time
          const decayRate = 0.001 * leadTimeMinutes;
          const decayFactor = Math.exp(-decayRate);
          
          frame[i][j] = 64 + (value - 64) * decayFactor;
          uncertainty[i][j] = (1 - motion.confidence) * 0.1 * leadTimeMinutes;
        }
      }
    }
    
    // Apply cascade decomposition for scale-dependent decay
    const cascadeResult = this.applyCascadeDecay(frame, leadTimeMinutes);
    
    return { frame: cascadeResult, uncertainty };
  }
  
  private blendedPrediction(
    currentFrame: number[][],
    features: WeatherFeature[],
    motionField: MotionVector[][],
    leadTimeMinutes: number,
    rng: SeededRNG,
    profile: RegionProfile
  ): { frame: number[][]; uncertainty: number[][] } {
    // Start with advection
    const advected = this.nowcastPrediction(currentFrame, motionField, leadTimeMinutes, rng);
    
    // Feature-based evolution
    const featureFrame = Array(64).fill(0).map(() => Array(64).fill(64));
    const uncertainty = Array(64).fill(0).map(() => Array(64).fill(0));
    
    for (const feature of features) {
      const evolved = this.evolveFeature(feature, leadTimeMinutes);
      this.renderEvolvedFeature(featureFrame, evolved);
      
      // Add uncertainty based on feature lifecycle
      const featureUncertainty = this.calculateFeatureUncertainty(evolved, leadTimeMinutes);
      this.addFeatureUncertainty(uncertainty, evolved, featureUncertainty);
    }
    
    // Blend advection and feature evolution
    const blendWeight = Math.min(1, leadTimeMinutes / 360);
    const blendedFrame = Array(64).fill(0).map(() => Array(64).fill(0));
    
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) {
        blendedFrame[i][j] = advected.frame[i][j] * (1 - blendWeight) + featureFrame[i][j] * blendWeight;
        uncertainty[i][j] = advected.uncertainty[i][j] * (1 - blendWeight) + uncertainty[i][j] * blendWeight;
      }
    }
    
    // Add convective initiation
    this.addConvectiveInitiation(blendedFrame, leadTimeMinutes, rng, profile);
    
    return { frame: blendedFrame, uncertainty };
  }
  
  private modelBasedPrediction(
    features: WeatherFeature[],
    historicalFrames: { timestamp: string; data: number[][] }[],
    leadTimeMinutes: number,
    rng: SeededRNG
  ): { frame: number[][]; uncertainty: number[][] } {
    const frame = Array(64).fill(0).map(() => Array(64).fill(64));
    const uncertainty = Array(64).fill(0).map(() => Array(64).fill(0.4));
    
    // Analyze synoptic pattern from historical data
    const pattern = this.analyzeSynopticPattern(historicalFrames);
    
    // Generate synthetic features based on climatology
    const syntheticFeatures = this.generateSyntheticFeatures(pattern, leadTimeMinutes, rng);
    
    // Evolve existing features with increased uncertainty
    for (const feature of features) {
      const evolved = this.longTermEvolution(feature, leadTimeMinutes);
      const spread = this.calculateUncertaintySpread(leadTimeMinutes);
      this.renderUncertainFeature(frame, evolved, spread);
    }
    
    // Add synthetic features
    for (const synthetic of syntheticFeatures) {
      this.renderEvolvedFeature(frame, synthetic);
    }
    
    // Apply diurnal cycle
    const currentTime = new Date(historicalFrames[historicalFrames.length - 1].timestamp);
    const hour = (currentTime.getHours() + leadTimeMinutes / 60) % 24;
    const diurnalFactor = 0.7 + 0.3 * Math.sin((hour - 6) * Math.PI / 12);
    
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) {
        frame[i][j] = 64 + (frame[i][j] - 64) * diurnalFactor;
        uncertainty[i][j] *= (1 + 0.2 * Math.abs(12 - hour) / 12);
      }
    }
    
    return { frame, uncertainty };
  }
  
  private applyCascadeDecay(frame: number[][], leadTimeMinutes: number): number[][] {
    const levels = 4;
    const cascade: number[][][] = [];
    let current = frame.map(row => [...row]);
    
    // Decompose
    for (let level = 0; level < levels; level++) {
      const smoothed = this.gaussianSmooth(current, Math.pow(2, level));
      const detail = current.map((row, i) => row.map((val, j) => val - smoothed[i][j]));
      cascade.push(detail);
      current = smoothed;
    }
    cascade.push(current);
    
    // Apply scale-dependent decay
    for (let level = 0; level < levels; level++) {
      const decayRate = 0.001 * Math.pow(2, levels - level) * (1 + leadTimeMinutes / 120);
      const decayFactor = Math.exp(-decayRate * leadTimeMinutes);
      cascade[level] = cascade[level].map(row => row.map(val => val * decayFactor));
    }
    
    // Reconstruct
    let reconstructed = cascade[levels];
    for (let level = levels - 1; level >= 0; level--) {
      reconstructed = reconstructed.map((row, i) => row.map((val, j) => val + cascade[level][i][j]));
    }
    
    return reconstructed;
  }
  
  private gaussianSmooth(frame: number[][], sigma: number): number[][] {
    const size = Math.ceil(sigma * 3);
    const kernel: number[][] = [];
    let sum = 0;
    
    for (let i = -size; i <= size; i++) {
      const row: number[] = [];
      for (let j = -size; j <= size; j++) {
        const val = Math.exp(-(i * i + j * j) / (2 * sigma * sigma));
        row.push(val);
        sum += val;
      }
      kernel.push(row);
    }
    
    // Normalize kernel
    for (let i = 0; i < kernel.length; i++) {
      for (let j = 0; j < kernel[0].length; j++) {
        kernel[i][j] /= sum;
      }
    }
    
    // Apply convolution
    const result = Array(64).fill(0).map(() => Array(64).fill(0));
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) {
        let val = 0;
        for (let ki = 0; ki < kernel.length; ki++) {
          for (let kj = 0; kj < kernel[0].length; kj++) {
            const fi = Math.max(0, Math.min(63, i + ki - size));
            const fj = Math.max(0, Math.min(63, j + kj - size));
            val += frame[fi][fj] * kernel[ki][kj];
          }
        }
        result[i][j] = val;
      }
    }
    
    return result;
  }
  
  private evolveFeature(feature: WeatherFeature, leadTimeMinutes: number) {
    const elapsedHours = leadTimeMinutes / 60;
    
    // Update position
    const newX = feature.initialX + feature.velocityX * elapsedHours;
    const newY = feature.initialY + feature.velocityY * elapsedHours;
    
    // Update intensity based on lifecycle
    let intensityMultiplier = 1;
    if (feature.stage === 'developing') {
      intensityMultiplier = Math.min(1.5, 1 + feature.growthRate * elapsedHours);
    } else if (feature.stage === 'mature') {
      intensityMultiplier = 1 + 0.1 * Math.sin(leadTimeMinutes / 30);
    } else if (feature.stage === 'dissipating') {
      intensityMultiplier = Math.max(0.2, Math.exp(-0.01 * leadTimeMinutes));
    }
    
    // Update size
    const sizeMultiplier = Math.sqrt(intensityMultiplier);
    
    return {
      ...feature,
      initialX: newX,
      initialY: newY,
      currentIntensity: feature.maxIntensity * intensityMultiplier,
      size: feature.size * sizeMultiplier
    };
  }
  
  private renderEvolvedFeature(frame: number[][], feature: WeatherFeature) {
    const gridI = Math.round(31.5 - feature.initialY / 4.6875);
    const gridJ = Math.round(31.5 + feature.initialX / 4.6875);
    const radiusPixels = Math.ceil(feature.size / 4.6875);
    
    for (let di = -radiusPixels; di <= radiusPixels; di++) {
      for (let dj = -radiusPixels; dj <= radiusPixels; dj++) {
        const i = gridI + di;
        const j = gridJ + dj;
        
        if (i >= 0 && i < 64 && j >= 0 && j < 64) {
          const distance = Math.sqrt(di * di + dj * dj);
          if (distance <= radiusPixels) {
            const falloff = Math.exp(-distance * distance / (2 * radiusPixels * radiusPixels / 9));
            const value = feature.currentIntensity * falloff;
            frame[i][j] = Math.max(frame[i][j], 64 + value);
          }
        }
      }
    }
  }
  
  private calculateFeatureUncertainty(feature: WeatherFeature, leadTimeMinutes: number): number {
    let baseUncertainty = 0.1;
    
    if (feature.stage === 'developing') baseUncertainty = 0.2;
    else if (feature.stage === 'dissipating') baseUncertainty = 0.3;
    
    return baseUncertainty * (1 + leadTimeMinutes / 120);
  }
  
  private addFeatureUncertainty(uncertainty: number[][], feature: WeatherFeature, level: number) {
    const gridI = Math.round(31.5 - feature.initialY / 4.6875);
    const gridJ = Math.round(31.5 + feature.initialX / 4.6875);
    const radiusPixels = Math.ceil(feature.size / 4.6875);
    
    for (let di = -radiusPixels; di <= radiusPixels; di++) {
      for (let dj = -radiusPixels; dj <= radiusPixels; dj++) {
        const i = gridI + di;
        const j = gridJ + dj;
        
        if (i >= 0 && i < 64 && j >= 0 && j < 64) {
          uncertainty[i][j] = Math.max(uncertainty[i][j], level);
        }
      }
    }
  }
  
  private addConvectiveInitiation(frame: number[][], leadTimeMinutes: number, rng: SeededRNG, profile: RegionProfile) {
    const instability = this.estimateInstability(leadTimeMinutes, profile);
    const numNewCells = rng.poisson(instability * 2);
    
    for (let n = 0; n < numNewCells; n++) {
      const i = rng.uniformInt(10, 53);
      const j = rng.uniformInt(10, 53);
      const intensity = 70 + instability * 30 * rng.next();
      const size = 2 + Math.sqrt(leadTimeMinutes / 60) * rng.next();
      
      for (let di = -size; di <= size; di++) {
        for (let dj = -size; dj <= size; dj++) {
          const fi = Math.max(0, Math.min(63, i + Math.floor(di)));
          const fj = Math.max(0, Math.min(63, j + Math.floor(dj)));
          const dist = Math.sqrt(di * di + dj * dj);
          if (dist <= size) {
            const value = intensity * Math.exp(-dist * dist / (2 * size * size));
            frame[fi][fj] = Math.max(frame[fi][fj], 64 + value);
          }
        }
      }
    }
  }
  
  private estimateInstability(leadTimeMinutes: number, profile: RegionProfile): number {
    const hour = (new Date().getHours() + leadTimeMinutes / 60) % 24;
    
    let diurnalFactor = 0.4;
    if (hour >= 12 && hour <= 20) diurnalFactor = 0.7;
    else if (hour >= 20 || hour <= 6) diurnalFactor = 0.2;
    
    return profile.convectiveInstability * diurnalFactor;
  }
  
  private analyzeSynopticPattern(frames: { timestamp: string; data: number[][] }[]) {
    // Simplified pattern analysis
    const avgIntensity = frames.reduce((sum, f) => {
      const frameSum = f.data.reduce((s, row) => s + row.reduce((rs, val) => rs + Math.max(0, val - 64), 0), 0);
      return sum + frameSum;
    }, 0) / frames.length;
    
    return {
      type: avgIntensity > 5000 ? 'active' : 'quiet',
      trend: 'steady',
      favorableZones: [[20, 20], [40, 40]]
    };
  }
  
  private generateSyntheticFeatures(pattern: { type: string; favorableZones: number[][] }, leadTimeMinutes: number, rng: SeededRNG): WeatherFeature[] {
    const features: WeatherFeature[] = [];
    const developmentProb = pattern.type === 'active' ? 0.7 : 0.3;
    
    if (rng.next() < developmentProb * Math.min(1, leadTimeMinutes / 360)) {
      const numFeatures = rng.poisson(2);
      
      for (let i = 0; i < numFeatures; i++) {
        const zone = pattern.favorableZones[rng.uniformInt(0, pattern.favorableZones.length - 1)];
        
        features.push({
          id: `synthetic-${leadTimeMinutes}-${i}`,
          initialX: (zone[1] - 31.5) * 4.6875 + rng.uniform(-10, 10),
          initialY: (31.5 - zone[0]) * 4.6875 + rng.uniform(-10, 10),
          maxIntensity: rng.uniform(70, 100),
          currentIntensity: rng.uniform(60, 80),
          size: rng.uniform(10, 25),
          eccentricity: rng.uniform(0.5, 1.5),
          orientation: rng.uniform(0, 360),
          velocityX: rng.uniform(-10, 10),
          velocityY: rng.uniform(-10, 10),
          birthTime: Date.now() + leadTimeMinutes * 60 * 1000,
          peakTime: Date.now() + (leadTimeMinutes + 120) * 60 * 1000,
          deathTime: Date.now() + (leadTimeMinutes + 360) * 60 * 1000,
          structure: 'circular',
          stage: 'developing',
          growthRate: 0.2,
          areaChange: 0.1,
          rotationRate: 0,
          convectiveDepth: 0.5,
          history: []
        });
      }
    }
    
    return features;
  }
  
  private longTermEvolution(feature: WeatherFeature, leadTimeMinutes: number) {
    const decayFactor = Math.exp(-0.005 * leadTimeMinutes);
    const spreadFactor = 1 + leadTimeMinutes / 720;
    
    return {
      ...feature,
      currentIntensity: feature.maxIntensity * decayFactor,
      size: feature.size * spreadFactor,
      stage: 'dissipating' as LifecycleStage
    };
  }
  
  private calculateUncertaintySpread(leadTimeMinutes: number): number {
    return Math.min(10, 2 + leadTimeMinutes / 60);
  }
  
  private renderUncertainFeature(frame: number[][], feature: WeatherFeature, spread: number) {
    const gridI = Math.round(31.5 - feature.initialY / 4.6875);
    const gridJ = Math.round(31.5 + feature.initialX / 4.6875);
    const radiusPixels = Math.ceil((feature.size + spread) / 4.6875);
    
    for (let di = -radiusPixels; di <= radiusPixels; di++) {
      for (let dj = -radiusPixels; dj <= radiusPixels; dj++) {
        const i = gridI + di;
        const j = gridJ + dj;
        
        if (i >= 0 && i < 64 && j >= 0 && j < 64) {
          const distance = Math.sqrt(di * di + dj * dj);
          if (distance <= radiusPixels) {
            const falloff = Math.exp(-distance * distance / (2 * (radiusPixels * radiusPixels) / 9));
            const value = feature.currentIntensity * falloff * (1 - distance / (radiusPixels * 2));
            frame[i][j] = Math.max(frame[i][j], 64 + value);
          }
        }
      }
    }
  }
  
  private applyEnsembleUncertainty(
    frame: number[][], 
    uncertaintyLevel: number, 
    leadTimeMinutes: number,
    rng: SeededRNG
  ): { frame: number[][], uncertainty: number[][], spread: number[][] } {
    const numMembers = 10;
    const ensembleFrames: number[][][] = [];
    
    // Generate ensemble members
    for (let member = 0; member < numMembers; member++) {
      const perturbedFrame = frame.map(row => [...row]);
      
      // Position uncertainty
      const shiftI = Math.round(rng.normal(0, uncertaintyLevel * 5));
      const shiftJ = Math.round(rng.normal(0, uncertaintyLevel * 5));
      
      // Apply shift with wraparound
      const shifted = Array(64).fill(0).map(() => Array(64).fill(64));
      for (let i = 0; i < 64; i++) {
        for (let j = 0; j < 64; j++) {
          const si = (i + shiftI + 64) % 64;
          const sj = (j + shiftJ + 64) % 64;
          shifted[i][j] = perturbedFrame[si][sj];
        }
      }
      
      // Intensity uncertainty
      const intensityFactor = 1 + rng.normal(0, uncertaintyLevel * 0.3);
      for (let i = 0; i < 64; i++) {
        for (let j = 0; j < 64; j++) {
          shifted[i][j] = 64 + (shifted[i][j] - 64) * Math.max(0, intensityFactor);
        }
      }
      
      ensembleFrames.push(shifted);
    }
    
    // Calculate ensemble statistics
    const meanFrame = Array(64).fill(0).map(() => Array(64).fill(0));
    const spreadFrame = Array(64).fill(0).map(() => Array(64).fill(0));
    const uncertaintyFrame = Array(64).fill(0).map(() => Array(64).fill(0));
    
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) {
        const values = ensembleFrames.map(f => f[i][j]);
        const mean = values.reduce((a, b) => a + b, 0) / numMembers;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numMembers;
        
        meanFrame[i][j] = mean;
        spreadFrame[i][j] = Math.sqrt(variance);
        uncertaintyFrame[i][j] = Math.min(1, spreadFrame[i][j] / 50);
      }
    }
    
    // Apply physical constraints
    const constrainedFrame = this.applyPhysicalConstraints(meanFrame, leadTimeMinutes);
    
    return {
      frame: constrainedFrame,
      uncertainty: uncertaintyFrame,
      spread: spreadFrame
    };
  }
  
  private applyPhysicalConstraints(frame: number[][], leadTimeMinutes: number): number[][] {
    // Conservation of reflectivity mass
    const totalReflectivity = frame.reduce((sum, row) => 
      sum + row.reduce((rs, val) => rs + Math.max(0, val - 64), 0), 0
    );
    
    const expectedDecay = Math.exp(-0.001 * leadTimeMinutes);
    const targetTotal = totalReflectivity * expectedDecay;
    
    const currentTotal = frame.reduce((sum, row) => 
      sum + row.reduce((rs, val) => rs + Math.max(0, val - 64), 0), 0
    );
    
    let scaledFrame = frame;
    if (currentTotal > 0) {
      const scaleFactor = targetTotal / currentTotal;
      scaledFrame = frame.map(row => row.map(val => 64 + (val - 64) * scaleFactor));
    }
    
    // Maximum growth rates
    const maxGrowthRate = Math.pow(1.5, leadTimeMinutes / 60);
    scaledFrame = scaledFrame.map(row => row.map(val => 
      Math.min(val, 64 + (150 - 64) * maxGrowthRate)
    ));
    
    // Smoothness constraints for longer lead times
    if (leadTimeMinutes > 120) {
      const smoothingSigma = 0.5 + leadTimeMinutes / 240;
      scaledFrame = this.gaussianSmooth(scaledFrame, smoothingSigma);
    }
    
    // Boundary decay
    return this.applyBoundaryDecay(scaledFrame, leadTimeMinutes);
  }
  
  private applyBoundaryDecay(frame: number[][], leadTimeMinutes: number): number[][] {
    const boundaryWidth = Math.min(10, leadTimeMinutes / 30);
    const result = frame.map(row => [...row]);
    
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) {
        const distanceFromBoundary = Math.min(i, j, 63 - i, 63 - j);
        if (distanceFromBoundary < boundaryWidth) {
          const decay = distanceFromBoundary / boundaryWidth;
          result[i][j] = 64 + (result[i][j] - 64) * decay;
        }
      }
    }
    
    return result;
  }
}

// --- 6. Region Profile Determination ---
function determineRegionProfile(latitude: number): RegionProfile {
  const absLat = Math.abs(latitude);
  
  if (absLat < 30) { // Tropical/Subtropical
    return {
      type: 'tropical',
      stormIntensity: [90, 150],
      movement: { speed: [15, 30], direction: [250, 290] },
      convectiveInstability: 0.7,
      shearStrength: 0.3
    };
  } else { // Temperate
    return {
      type: 'temperate',
      stormIntensity: [70, 120],
      movement: { speed: [30, 50], direction: [70, 110] },
      convectiveInstability: 0.5,
      shearStrength: 0.6
    };
  }
}

// --- 7. Main Generator Class ---
class MockRadarDataGenerator {
  private cache: Map<string, { radar: RawRadarDataResponse, predict: NowcastingPredictionResponse }> = new Map();
  private predictor = new WeatherPredictor();

  public generate(site: RadarSite, hours_back: number): { radar: RawRadarDataResponse, predict: NowcastingPredictionResponse } {
    const cacheKey = `${site.site_id}-${hours_back}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    const endTime = Date.now();
    const startTime = endTime - hours_back * 3600 * 1000;

    // Generate consistent seed for deterministic behavior
    const today = new Date();
    const dateString = `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`;
    const dailySeedString = `${site.site_id},${dateString}`;
    const masterSeed = simpleHash(dailySeedString);
    const rng = new SeededRNG(masterSeed);
    
    const profile = determineRegionProfile(site.coordinates[0]);

    // Generate historical frames
    const historicalFrames: { timestamp: string; data: number[][] }[] = [];
    const frameCount = Math.min(hours_back * 12, 20); // More frames for better motion analysis
    
    for (let i = 0; i < frameCount; i++) {
      const timestamp = startTime + (i * (endTime - startTime)) / (frameCount - 1);
      const frame = this.generateFrameAtTime(timestamp, rng, profile);
      historicalFrames.push({
        timestamp: new Date(timestamp).toISOString(),
        data: frame
      });
    }

    // Generate predictions using the new algorithm
    const predictions = this.predictor.generatePredictions(
      historicalFrames.slice(-5), // Use last 5 frames for motion analysis
      1, // 1 hour of predictions
      10, // 10-minute intervals
      rng,
      profile
    );

    // Convert predictions to the expected format
    const predictionFrames: number[][][][] = predictions.map(pred => 
      pred.data.map(row => row.map(cell => [cell]))
    );

    // Prepare response objects
    const site_info = { ...site, name: `${site.name} (Enhanced)` };
    
    // Calculate bounds based on site location and range
    // 150km range = ~1.35 degrees latitude, ~1.5 degrees longitude (varies by latitude)
    const latRange = 1.35;
    const lonRange = 1.5 / Math.cos(site.coordinates[0] * Math.PI / 180);
    
    const coordinates = {
      bounds: [
        site.coordinates[1] - lonRange,  // west
        site.coordinates[1] + lonRange,  // east
        site.coordinates[0] - latRange,  // south
        site.coordinates[0] + latRange   // north
      ] as [number, number, number, number],
      center: site.coordinates,
      resolution_deg: 0.046,
      resolution_km: 4.68,
      projection: "PlateCarree",
      range_km: 150
    };

    const radarResponse: RawRadarDataResponse = {
      success: true,
      site_info,
      frames: historicalFrames.slice(-5).map(f => ({
        ...f,
        coordinates,
        intensity_range: [0, 150],
        data_quality: 'good'
      })),
      total_frames: 5,
      time_range: {
        start: historicalFrames[historicalFrames.length - 5].timestamp,
        end: historicalFrames[historicalFrames.length - 1].timestamp
      }
    };

    const predictResponse: NowcastingPredictionResponse = {
      success: true,
      site_info,
      prediction_frames: predictionFrames,
      prediction_timestamp: new Date(endTime).toISOString()
    };
    
    const result = { radar: radarResponse, predict: predictResponse };
    this.cache.set(cacheKey, result);
    return result;
  }

  private generateFrameAtTime(timestamp: number, rng: SeededRNG, profile: RegionProfile): number[][] {
    const frame = Array(64).fill(0).map(() => Array(64).fill(64));
    
    // Generate weather features
    const numFeatures = rng.uniformInt(2, 5);
    
    for (let f = 0; f < numFeatures; f++) {
      const feature = this.generateFeature(timestamp, rng, profile);
      this.renderFeature(frame, feature, timestamp);
    }
    
    // Add noise and environmental effects
    this.addEnvironmentalEffects(frame, rng);
    
    // Ensure values are within valid range
    return frame.map(row => row.map(cell => Math.max(64, Math.min(150, cell))));
  }

  private generateFeature(timestamp: number, rng: SeededRNG, profile: RegionProfile): WeatherFeature {
    const structure = rng.choice<StructureType>(['circular', 'linear', 'cluster', 'banded', 'supercell', 'squall_line']);
    const stage = rng.choice<LifecycleStage>(['developing', 'mature', 'dissipating', 'steady']);
    
    const speed = rng.uniform(...profile.movement.speed);
    const direction = rng.uniform(...profile.movement.direction) * Math.PI / 180;
    
    const feature: WeatherFeature = {
      id: `feature-${timestamp}-${rng.uniformInt(0, 1000)}`,
      initialX: rng.uniform(-100, 100),
      initialY: rng.uniform(-100, 100),
      maxIntensity: rng.uniform(...profile.stormIntensity),
      currentIntensity: rng.uniform(70, 120),
      size: rng.uniform(15, 40),
      eccentricity: structure === 'linear' || structure === 'squall_line' ? rng.uniform(2, 3) : rng.uniform(0.8, 1.5),
      orientation: rng.uniform(0, 360),
      velocityX: speed * Math.cos(direction),
      velocityY: speed * Math.sin(direction),
      birthTime: timestamp - rng.uniform(1, 3) * 3600 * 1000,
      peakTime: timestamp + rng.uniform(-1, 2) * 3600 * 1000,
      deathTime: timestamp + rng.uniform(2, 5) * 3600 * 1000,
      structure,
      stage,
      growthRate: stage === 'developing' ? 0.2 : stage === 'dissipating' ? -0.15 : 0,
      areaChange: stage === 'developing' ? 0.1 : stage === 'dissipating' ? -0.1 : 0,
      rotationRate: structure === 'supercell' ? rng.uniform(0.1, 0.3) : 0,
      convectiveDepth: rng.uniform(0.4, 0.9),
      subCells: structure === 'cluster' ? Array.from({ length: rng.uniformInt(3, 5) }, () => ({
        offsetX: rng.uniform(-15, 15),
        offsetY: rng.uniform(-15, 15),
        intensityFactor: rng.uniform(0.5, 1.0)
      })) : undefined,
      history: []
    };
    
    return feature;
  }

  private renderFeature(frame: number[][], feature: WeatherFeature, timestamp: number) {
    const elapsedHours = (timestamp - feature.birthTime) / (3600 * 1000);
    const currentX = feature.initialX + feature.velocityX * elapsedHours;
    const currentY = feature.initialY + feature.velocityY * elapsedHours;
    
    // Calculate intensity based on lifecycle
    let intensityMultiplier = 1;
    if (timestamp < feature.peakTime) {
      const progress = (timestamp - feature.birthTime) / (feature.peakTime - feature.birthTime);
      intensityMultiplier = Math.pow(progress, 0.7);
    } else if (timestamp < feature.deathTime) {
      const progress = (timestamp - feature.peakTime) / (feature.deathTime - feature.peakTime);
      intensityMultiplier = 1 - progress * 0.7;
    } else {
      return; // Feature has died
    }
    
    const intensity = feature.maxIntensity * intensityMultiplier;
    const gridI = Math.round(31.5 - currentY / 4.6875);
    const gridJ = Math.round(31.5 + currentX / 4.6875);
    
    // Render based on structure type
    switch (feature.structure) {
      case 'supercell':
        this.renderSupercell(frame, gridI, gridJ, intensity, feature.size, feature.rotationRate);
        break;
      case 'squall_line':
        this.renderSquallLine(frame, gridI, gridJ, intensity, feature.size, feature.orientation);
        break;
      case 'cluster':
        this.renderCluster(frame, gridI, gridJ, intensity, feature.size, feature.subCells || []);
        break;
      case 'banded':
        this.renderBanded(frame, gridI, gridJ, intensity, feature.size, feature.orientation);
        break;
      default:
        this.renderCircular(frame, gridI, gridJ, intensity, feature.size, feature.eccentricity, feature.orientation);
    }
  }

  private renderSupercell(frame: number[][], centerI: number, centerJ: number, intensity: number, size: number, rotationRate: number) {
    const radiusPixels = Math.ceil(size / 4.6875);
    
    for (let di = -radiusPixels; di <= radiusPixels; di++) {
      for (let dj = -radiusPixels; dj <= radiusPixels; dj++) {
        const i = centerI + di;
        const j = centerJ + dj;
        
        if (i >= 0 && i < 64 && j >= 0 && j < 64) {
          const distance = Math.sqrt(di * di + dj * dj);
          const angle = Math.atan2(dj, di);
          
          // Spiral structure
          const spiralOffset = angle + rotationRate * distance;
          const spiralIntensity = 0.7 + 0.3 * Math.sin(spiralOffset * 3);
          
          // Hook echo
          const hookAngle = Math.PI / 4;
          const hookIntensity = angle > hookAngle && angle < hookAngle + Math.PI / 2 ? 1.2 : 1;
          
          if (distance <= radiusPixels) {
            const falloff = Math.exp(-distance * distance / (2 * radiusPixels * radiusPixels / 9));
            const value = intensity * falloff * spiralIntensity * hookIntensity;
            frame[i][j] = Math.max(frame[i][j], 64 + value);
          }
        }
      }
    }
  }

  private renderSquallLine(frame: number[][], centerI: number, centerJ: number, intensity: number, size: number, orientation: number) {
    const length = size * 3;
    const width = size * 0.5;
    const angleRad = orientation * Math.PI / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) {
        const di = i - centerI;
        const dj = j - centerJ;
        
        // Rotate coordinates
        const rotX = dj * cosA - di * sinA;
        const rotY = dj * sinA + di * cosA;
        
        if (Math.abs(rotX) <= length / 4.6875 && Math.abs(rotY) <= width / 4.6875) {
          const alongLine = Math.exp(-Math.abs(rotY) / (width / 4.6875));
          const leadingEdge = rotX > 0 ? 1.2 : 0.8; // Stronger on leading edge
          const value = intensity * alongLine * leadingEdge;
          frame[i][j] = Math.max(frame[i][j], 64 + value);
        }
      }
    }
  }

  private renderCluster(frame: number[][], centerI: number, centerJ: number, intensity: number, size: number, subCells: { offsetX: number; offsetY: number; intensityFactor: number }[]) {
    for (const cell of subCells) {
      const cellI = centerI + Math.round(cell.offsetY / 4.6875);
      const cellJ = centerJ + Math.round(cell.offsetX / 4.6875);
      const cellSize = size * 0.5;
      const cellIntensity = intensity * cell.intensityFactor;
      
      this.renderCircular(frame, cellI, cellJ, cellIntensity, cellSize, 1, 0);
    }
  }

  private renderBanded(frame: number[][], centerI: number, centerJ: number, intensity: number, size: number, orientation: number) {
    const radiusPixels = Math.ceil(size / 4.6875);
    const angleRad = orientation * Math.PI / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    
    for (let di = -radiusPixels; di <= radiusPixels; di++) {
      for (let dj = -radiusPixels; dj <= radiusPixels; dj++) {
        const i = centerI + di;
        const j = centerJ + dj;
        
        if (i >= 0 && i < 64 && j >= 0 && j < 64) {
          const rotX = dj * cosA - di * sinA;
          const rotY = dj * sinA + di * cosA;
          const distance = Math.sqrt(rotX * rotX + rotY * rotY);
          
          if (distance <= radiusPixels) {
            const bands = 0.5 + 0.5 * Math.sin(distance / (radiusPixels / 4));
            const falloff = Math.exp(-distance / radiusPixels);
            const value = intensity * falloff * bands;
            frame[i][j] = Math.max(frame[i][j], 64 + value);
          }
        }
      }
    }
  }

  private renderCircular(frame: number[][], centerI: number, centerJ: number, intensity: number, size: number, eccentricity: number, orientation: number) {
    const radiusPixels = Math.ceil(size / 4.6875);
    const angleRad = orientation * Math.PI / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    
    for (let di = -radiusPixels * 2; di <= radiusPixels * 2; di++) {
      for (let dj = -radiusPixels * 2; dj <= radiusPixels * 2; dj++) {
        const i = centerI + di;
        const j = centerJ + dj;
        
        if (i >= 0 && i < 64 && j >= 0 && j < 64) {
          // Rotate coordinates
          const rotX = dj * cosA - di * sinA;
          const rotY = dj * sinA + di * cosA;
          
          // Apply eccentricity
          const effectiveDist = Math.sqrt(Math.pow(rotX / eccentricity, 2) + Math.pow(rotY, 2));
          
          if (effectiveDist <= radiusPixels) {
            const falloff = Math.exp(-effectiveDist * effectiveDist / (2 * radiusPixels * radiusPixels / 9));
            const value = intensity * falloff;
            frame[i][j] = Math.max(frame[i][j], 64 + value);
          }
        }
      }
    }
  }

  private addEnvironmentalEffects(frame: number[][], rng: SeededRNG) {
    // Add ground clutter
    for (let i = 30; i < 34; i++) {
      for (let j = 30; j < 34; j++) {
        frame[i][j] = Math.max(frame[i][j], 64 + rng.uniform(5, 15));
      }
    }
    
    // Add light precipitation areas
    for (let n = 0; n < 3; n++) {
      const i = rng.uniformInt(5, 58);
      const j = rng.uniformInt(5, 58);
      const radius = rng.uniform(2, 5);
      
      for (let di = -radius; di <= radius; di++) {
        for (let dj = -radius; dj <= radius; dj++) {
          const fi = Math.max(0, Math.min(63, i + Math.floor(di)));
          const fj = Math.max(0, Math.min(63, j + Math.floor(dj)));
          const dist = Math.sqrt(di * di + dj * dj);
          if (dist <= radius) {
            const value = rng.uniform(65, 75) * Math.exp(-dist * dist / (2 * radius * radius));
            frame[fi][fj] = Math.max(frame[fi][fj], value);
          }
        }
      }
    }
  }
}

export const mockDataGenerator = new MockRadarDataGenerator();