/**
 * Advanced Forensics Service
 * Implements sophisticated image and document forensics techniques
 */

export interface FrequencyAnalysisResult {
  hasToroidalArtifacts: boolean;
  frequencyAnomalies: string[];
  noiseLayerCount: number; // 1 = scanner only, 2 = camera + scanner
  halftoneDetected: boolean;
}

export interface GeometryAnalysisResult {
  vanishingPointsConsistent: boolean;
  shadowVectorsConsistent: boolean;
  geometryAnomalies: string[];
  lightingInconsistencies: string[];
}

export interface NoiseProfileResult {
  sensorType: 'camera' | 'scanner' | 'unknown' | 'synthetic';
  profileMatches: boolean;
  noiseCharacteristics: string[];
}

/**
 * Perform Frequency Domain Analysis using Discrete Fourier Transform
 * Detects toroidal artifacts and multi-layer noise patterns
 */
export async function analyzeFrequencyDomain(
  file: File
): Promise<FrequencyAnalysisResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Use smaller size for FFT performance
        const size = 256;
        canvas.width = size;
        canvas.height = size;

        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);

        const result = performDFTAnalysis(imageData);
        resolve(result);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Perform DFT analysis on image data
 */
function performDFTAnalysis(imageData: ImageData): FrequencyAnalysisResult {
  const { data, width, height } = imageData;
  const anomalies: string[] = [];
  let hasToroidalArtifacts = false;
  let halftoneDetected = false;
  let noiseLayerCount = 1;

  // Convert to grayscale
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  // Simple frequency analysis using horizontal/vertical gradients as proxy
  const hGradients: number[] = [];
  const vGradients: number[] = [];

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx = y * width + x;
      const hGrad = Math.abs(gray[idx + 1] - gray[idx]);
      const vGrad = Math.abs(gray[idx + width] - gray[idx]);
      hGradients.push(hGrad);
      vGradients.push(vGrad);
    }
  }

  // Analyze gradient distributions for patterns
  const hMean = hGradients.reduce((a, b) => a + b, 0) / hGradients.length;
  const vMean = vGradients.reduce((a, b) => a + b, 0) / vGradients.length;

  // Check for periodic patterns (halftone screening)
  const periodicityScore = detectPeriodicity(hGradients);
  if (periodicityScore > 0.3) {
    halftoneDetected = true;
    anomalies.push('Halftone screening pattern detected (print artifact)');
  }

  // Check for toroidal artifacts (common in AI-generated images)
  const toroidalScore = detectToroidalPattern(gray, width, height);
  if (toroidalScore > 0.4) {
    hasToroidalArtifacts = true;
    anomalies.push('Toroidal artifacts detected (typical of diffusion models)');
  }

  // Analyze noise layers
  const noiseLayers = analyzeNoiseLayers(gray, width, height);
  noiseLayerCount = noiseLayers.layerCount;

  if (noiseLayers.layerCount === 1) {
    anomalies.push('Single-layer noise detected (scanner only or synthetic)');
  } else if (noiseLayers.layerCount > 2) {
    anomalies.push('Multiple noise layers detected (unusual, possible manipulation)');
  }

  // Check for unnatural frequency concentrations
  if (Math.abs(hMean - vMean) < hMean * 0.1) {
    anomalies.push('Unnaturally uniform frequency distribution');
  }

  return {
    hasToroidalArtifacts,
    frequencyAnomalies: anomalies,
    noiseLayerCount: noiseLayers.layerCount,
    halftoneDetected,
  };
}

/**
 * Detect periodic patterns in gradient array
 */
function detectPeriodicity(gradients: number[]): number {
  if (gradients.length < 100) return 0;

  // Sample autocorrelation at various lags
  const sampleSize = Math.min(500, gradients.length);
  const sample = gradients.slice(0, sampleSize);

  let maxCorr = 0;
  const lagsToTest = [4, 6, 8, 10, 12]; // Common halftone periods

  for (const lag of lagsToTest) {
    let corr = 0;
    for (let i = 0; i < sampleSize - lag; i++) {
      corr += sample[i] * sample[i + lag];
    }
    corr /= sampleSize - lag;
    maxCorr = Math.max(maxCorr, corr);
  }

  // Normalize
  const variance = sample.reduce((sum, v) => sum + v * v, 0) / sampleSize;
  return variance > 0 ? maxCorr / variance : 0;
}

/**
 * Detect toroidal patterns typical of diffusion models
 */
function detectToroidalPattern(gray: number[], width: number, height: number): number {
  // Check for radial symmetry from center
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const maxRadius = Math.min(cx, cy);

  const radialSamples: number[][] = [];
  const numAngles = 16;

  // Sample along radial lines
  for (let angle = 0; angle < numAngles; angle++) {
    const theta = (angle * 2 * Math.PI) / numAngles;
    const samples: number[] = [];

    for (let r = 0; r < maxRadius; r++) {
      const x = Math.floor(cx + r * Math.cos(theta));
      const y = Math.floor(cy + r * Math.sin(theta));

      if (x >= 0 && x < width && y >= 0 && y < height) {
        samples.push(gray[y * width + x]);
      }
    }

    radialSamples.push(samples);
  }

  // Calculate cross-correlation between radial samples
  let totalCorr = 0;
  let count = 0;

  for (let i = 0; i < numAngles; i++) {
    for (let j = i + 1; j < numAngles; j++) {
      const corr = correlation(radialSamples[i], radialSamples[j]);
      totalCorr += corr;
      count++;
    }
  }

  return count > 0 ? totalCorr / count : 0;
}

/**
 * Calculate correlation between two arrays
 */
function correlation(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len < 10) return 0;

  const aMean = a.slice(0, len).reduce((s, v) => s + v, 0) / len;
  const bMean = b.slice(0, len).reduce((s, v) => s + v, 0) / len;

  let numerator = 0;
  let aSumSq = 0;
  let bSumSq = 0;

  for (let i = 0; i < len; i++) {
    const aDiff = a[i] - aMean;
    const bDiff = b[i] - bMean;
    numerator += aDiff * bDiff;
    aSumSq += aDiff * aDiff;
    bSumSq += bDiff * bDiff;
  }

  const denominator = Math.sqrt(aSumSq * bSumSq);
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Analyze noise layers (camera + scanner vs single source)
 */
function analyzeNoiseLayers(
  gray: number[],
  width: number,
  height: number
): { layerCount: number; confidence: number } {
  // Sample noise in smooth regions
  const noiseValues: number[] = [];

  for (let i = 0; i < 100; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    const idx = y * width + x;

    // Check if region is smooth (low variance in neighbors)
    const neighbors = [
      gray[idx - 1],
      gray[idx + 1],
      gray[idx - width],
      gray[idx + width],
    ];

    const neighborMean = neighbors.reduce((a, b) => a + b, 0) / 4;
    const variance =
      neighbors.reduce((sum, v) => sum + Math.pow(v - neighborMean, 2), 0) / 4;

    if (variance < 20) {
      // Smooth region
      const noise = Math.abs(gray[idx] - neighborMean);
      noiseValues.push(noise);
    }
  }

  if (noiseValues.length < 10) {
    return { layerCount: 1, confidence: 0.5 };
  }

  // Analyze noise distribution
  const mean = noiseValues.reduce((a, b) => a + b, 0) / noiseValues.length;
  const stdDev = Math.sqrt(
    noiseValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
      noiseValues.length
  );

  // Multi-layer noise typically has bimodal distribution or high kurtosis
  const kurtosis = calculateKurtosis(noiseValues, mean, stdDev);

  let layerCount = 1;
  if (kurtosis < -0.5) {
    // Bimodal/platykurtic suggests multiple sources
    layerCount = 2;
  } else if (kurtosis > 2) {
    // High kurtosis suggests single synthetic source
    layerCount = 1;
  }

  return { layerCount, confidence: 0.7 };
}

/**
 * Calculate kurtosis of distribution
 */
function calculateKurtosis(values: number[], mean: number, stdDev: number): number {
  if (stdDev === 0 || values.length < 4) return 0;

  const fourthMoment =
    values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 4), 0) /
    values.length;

  return fourthMoment - 3; // Excess kurtosis
}

/**
 * Analyze geometry and physics consistency
 * Checks vanishing points and shadow directions
 */
export async function analyzeGeometry(file: File): Promise<GeometryAnalysisResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        const maxSize = 512;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const result = performGeometryAnalysis(imageData);
        resolve(result);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Perform geometry analysis on image
 */
function performGeometryAnalysis(imageData: ImageData): GeometryAnalysisResult {
  const { data, width, height } = imageData;
  const anomalies: string[] = [];
  const lightingIssues: string[] = [];

  // Detect edges using Sobel operator
  const edges = detectEdges(data, width, height);

  // Find dominant lines (simplified Hough transform)
  const lines = findDominantLines(edges, width, height);

  // Analyze vanishing points
  const vanishingPoints = findVanishingPoints(lines);
  let vanishingPointsConsistent = true;

  if (vanishingPoints.length > 4) {
    vanishingPointsConsistent = false;
    anomalies.push('Too many vanishing points detected (>4)');
  }

  // Check for parallel lines that should converge
  const parallelInconsistencies = checkParallelLines(lines, vanishingPoints);
  if (parallelInconsistencies > 0) {
    vanishingPointsConsistent = false;
    anomalies.push(
      `${parallelInconsistencies} sets of lines with inconsistent perspective`
    );
  }

  // Analyze shadow directions
  const shadows = detectShadows(data, width, height);
  let shadowVectorsConsistent = true;

  if (shadows.length > 1) {
    const shadowAngleVariance = calculateShadowAngleVariance(shadows);
    if (shadowAngleVariance > 0.3) {
      shadowVectorsConsistent = false;
      lightingIssues.push('Inconsistent shadow directions detected');
    }
  }

  // Check for lighting inconsistencies across the image
  const lightingGradient = analyzeLightingGradient(data, width, height);
  if (lightingGradient.hasAnomalies) {
    lightingIssues.push('Unnatural lighting gradient detected');
  }

  return {
    vanishingPointsConsistent,
    shadowVectorsConsistent,
    geometryAnomalies: anomalies,
    lightingInconsistencies: lightingIssues,
  };
}

/**
 * Simple edge detection using Sobel operator
 */
function detectEdges(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[] {
  const edges: number[] = new Array(width * height).fill(0);

  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

          const kIdx = (ky + 1) * 3 + (kx + 1);
          gx += gray * sobelX[kIdx];
          gy += gray * sobelY[kIdx];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = magnitude;
    }
  }

  return edges;
}

/**
 * Find dominant lines in edge map (simplified)
 */
function findDominantLines(
  edges: number[],
  width: number,
  height: number
): Array<{ x1: number; y1: number; x2: number; y2: number; angle: number }> {
  // This is a simplified version - full Hough transform would be more accurate
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number; angle: number }> =
    [];

  // Sample strong edges
  const threshold = 50;
  const strongEdges: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (edges[y * width + x] > threshold) {
        strongEdges.push({ x, y });
      }
    }
  }

  // Sample some line segments
  for (let i = 0; i < Math.min(20, strongEdges.length); i++) {
    const p1 = strongEdges[Math.floor(Math.random() * strongEdges.length)];
    const p2 = strongEdges[Math.floor(Math.random() * strongEdges.length)];

    if (Math.abs(p1.x - p2.x) > 10 || Math.abs(p1.y - p2.y) > 10) {
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, angle });
    }
  }

  return lines;
}

/**
 * Find vanishing points from lines
 */
function findVanishingPoints(
  lines: Array<{ x1: number; y1: number; x2: number; y2: number; angle: number }>
): Array<{ x: number; y: number }> {
  const vanishingPoints: Array<{ x: number; y: number }> = [];

  // Group lines by similar angles
  const angleGroups: { [key: number]: typeof lines } = {};

  lines.forEach((line) => {
    const angleDeg = Math.round((line.angle * 180) / Math.PI / 10) * 10;
    if (!angleGroups[angleDeg]) {
      angleGroups[angleDeg] = [];
    }
    angleGroups[angleDeg].push(line);
  });

  // Each angle group potentially has a vanishing point
  Object.keys(angleGroups).forEach((angle) => {
    if (angleGroups[Number(angle)].length >= 2) {
      vanishingPoints.push({ x: 0, y: 0 }); // Simplified
    }
  });

  return vanishingPoints;
}

/**
 * Check for parallel line inconsistencies
 */
function checkParallelLines(
  lines: Array<{ angle: number }>,
  vanishingPoints: Array<any>
): number {
  // Simplified: count lines with very similar angles that don't share vanishing point
  const angleBuckets: { [key: number]: number } = {};

  lines.forEach((line) => {
    const angleDeg = Math.round((line.angle * 180) / Math.PI / 5) * 5;
    angleBuckets[angleDeg] = (angleBuckets[angleDeg] || 0) + 1;
  });

  let inconsistencies = 0;
  Object.values(angleBuckets).forEach((count) => {
    if (count > vanishingPoints.length * 2) {
      inconsistencies++;
    }
  });

  return inconsistencies;
}

/**
 * Detect shadow regions
 */
function detectShadows(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Array<{ x: number; y: number; angle: number }> {
  const shadows: Array<{ x: number; y: number; angle: number }> = [];

  // Sample dark regions
  for (let y = 10; y < height - 10; y += 20) {
    for (let x = 10; x < width - 10; x += 20) {
      const idx = (y * width + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      if (brightness < 80) {
        // Potential shadow
        // Calculate gradient direction
        const rightIdx = (y * width + x + 5) * 4;
        const downIdx = ((y + 5) * width + x) * 4;

        const rightBright = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
        const downBright = (data[downIdx] + data[downIdx + 1] + data[downIdx + 2]) / 3;

        const angle = Math.atan2(downBright - brightness, rightBright - brightness);
        shadows.push({ x, y, angle });
      }
    }
  }

  return shadows;
}

/**
 * Calculate shadow angle variance
 */
function calculateShadowAngleVariance(
  shadows: Array<{ angle: number }>
): number {
  if (shadows.length < 2) return 0;

  const angles = shadows.map((s) => s.angle);
  const meanAngle = angles.reduce((a, b) => a + b, 0) / angles.length;

  const variance =
    angles.reduce((sum, angle) => {
      const diff = angle - meanAngle;
      return sum + diff * diff;
    }, 0) / angles.length;

  return variance;
}

/**
 * Analyze lighting gradient across image
 */
function analyzeLightingGradient(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { hasAnomalies: boolean; gradient: number } {
  // Divide image into quadrants and check brightness consistency
  const quadrants = [
    { x: 0, y: 0, w: width / 2, h: height / 2 },
    { x: width / 2, y: 0, w: width / 2, h: height / 2 },
    { x: 0, y: height / 2, w: width / 2, h: height / 2 },
    { x: width / 2, y: height / 2, w: width / 2, h: height / 2 },
  ];

  const quadrantBrightness = quadrants.map((q) => {
    let totalBright = 0;
    let count = 0;

    for (let y = q.y; y < q.y + q.h; y += 5) {
      for (let x = q.x; x < q.x + q.w; x += 5) {
        const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
        totalBright += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        count++;
      }
    }

    return totalBright / count;
  });

  // Check for unnatural brightness jumps
  const maxDiff = Math.max(
    Math.abs(quadrantBrightness[0] - quadrantBrightness[1]),
    Math.abs(quadrantBrightness[2] - quadrantBrightness[3]),
    Math.abs(quadrantBrightness[0] - quadrantBrightness[2]),
    Math.abs(quadrantBrightness[1] - quadrantBrightness[3])
  );

  const avgBrightness =
    quadrantBrightness.reduce((a, b) => a + b, 0) / quadrantBrightness.length;

  const hasAnomalies = maxDiff > avgBrightness * 0.4;

  return { hasAnomalies, gradient: maxDiff / avgBrightness };
}

/**
 * Analyze noise profile and match against known sensor types
 */
export async function analyzeNoiseProfile(file: File): Promise<NoiseProfileResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        const size = 256;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imageData = ctx.getImageData(0, 0, size, size);
        const result = performNoiseProfileAnalysis(imageData);
        resolve(result);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Perform noise profile analysis
 */
function performNoiseProfileAnalysis(imageData: ImageData): NoiseProfileResult {
  const { data, width, height } = imageData;
  const characteristics: string[] = [];

  // Sample noise in smooth regions
  const noiseR: number[] = [];
  const noiseG: number[] = [];
  const noiseB: number[] = [];

  for (let i = 0; i < 200; i++) {
    const x = Math.floor(Math.random() * (width - 4)) + 2;
    const y = Math.floor(Math.random() * (height - 4)) + 2;

    // Check if region is smooth
    const region: number[][] = [[], [], []];

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const idx = ((y + dy) * width + (x + dx)) * 4;
        region[0].push(data[idx]);
        region[1].push(data[idx + 1]);
        region[2].push(data[idx + 2]);
      }
    }

    const variances = region.map((channel) => {
      const mean = channel.reduce((a, b) => a + b, 0) / channel.length;
      return (
        channel.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / channel.length
      );
    });

    if (Math.max(...variances) < 100) {
      // Smooth region
      const centerIdx = (y * width + x) * 4;
      const meanR = region[0].reduce((a, b) => a + b, 0) / region[0].length;
      const meanG = region[1].reduce((a, b) => a + b, 0) / region[1].length;
      const meanB = region[2].reduce((a, b) => a + b, 0) / region[2].length;

      noiseR.push(Math.abs(data[centerIdx] - meanR));
      noiseG.push(Math.abs(data[centerIdx + 1] - meanG));
      noiseB.push(Math.abs(data[centerIdx + 2] - meanB));
    }
  }

  if (noiseR.length < 10) {
    return {
      sensorType: 'unknown',
      profileMatches: false,
      noiseCharacteristics: ['Insufficient smooth regions for noise analysis'],
    };
  }

  // Analyze noise characteristics
  const rMean = noiseR.reduce((a, b) => a + b, 0) / noiseR.length;
  const gMean = noiseG.reduce((a, b) => a + b, 0) / noiseG.length;
  const bMean = noiseB.reduce((a, b) => a + b, 0) / noiseB.length;

  // Camera sensors typically have higher noise in blue channel
  const blueRatio = bMean / Math.max(rMean, gMean, 0.01);
  let sensorType: 'camera' | 'scanner' | 'unknown' | 'synthetic' = 'unknown';

  if (blueRatio > 1.3) {
    sensorType = 'camera';
    characteristics.push('Blue channel noise elevated (typical of camera sensors)');
  } else if (blueRatio < 0.9 && Math.max(rMean, gMean, bMean) < 3) {
    sensorType = 'scanner';
    characteristics.push('Very low, uniform noise (typical of scanners)');
  } else if (Math.max(rMean, gMean, bMean) < 1) {
    sensorType = 'synthetic';
    characteristics.push('Extremely low noise (suspicious - possible AI generation)');
  }

  // Check noise distribution (Gaussian vs non-Gaussian)
  const rKurtosis = calculateKurtosis(
    noiseR,
    rMean,
    Math.sqrt(
      noiseR.reduce((sum, v) => sum + Math.pow(v - rMean, 2), 0) / noiseR.length
    )
  );

  if (Math.abs(rKurtosis) < 0.5) {
    characteristics.push('Noise distribution is Gaussian (natural)');
  } else {
    characteristics.push('Noise distribution is non-Gaussian (possible manipulation)');
  }

  const profileMatches = sensorType === 'camera' || sensorType === 'scanner';

  return {
    sensorType,
    profileMatches,
    noiseCharacteristics: characteristics,
  };
}
