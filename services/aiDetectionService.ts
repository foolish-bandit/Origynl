/**
 * AI Detection Service
 * Detects if content (images, text, documents) is AI-generated
 * Uses multiple detection strategies for comprehensive analysis
 */

export interface AIDetectionResult {
  isAIGenerated: boolean;
  confidence: number; // 0-100
  provider: string;
  details: {
    imageAnalysis?: ImageAnalysis;
    textAnalysis?: TextAnalysis;
    metadataAnalysis?: MetadataAnalysis;
  };
  warnings: string[];
  timestamp: number;
}

interface ImageAnalysis {
  hasAIArtifacts: boolean;
  suspiciousPatterns: string[];
  compressionAnalysis: {
    consistent: boolean;
    anomalies: string[];
  };
  noiseAnalysis: {
    natural: boolean;
    artificialPatterns: string[];
  };
}

interface TextAnalysis {
  hasAIPatterns: boolean;
  perplexityScore?: number;
  burstinessScore?: number;
  suspiciousPatterns: string[];
}

interface MetadataAnalysis {
  hasAIToolSignatures: boolean;
  detectedTools: string[];
  metadataComplete: boolean;
  suspiciousFields: string[];
}

// Known AI tool signatures in metadata
const AI_TOOL_SIGNATURES = {
  software: [
    'midjourney',
    'dall-e',
    'dall·e',
    'stable diffusion',
    'stablediffusion',
    'adobe firefly',
    'firefly',
    'chatgpt',
    'gpt-4',
    'claude',
    'leonardo.ai',
    'leonardo',
    'runway',
    'canva ai',
  ],
  generators: [
    'ai generated',
    'ai-generated',
    'artificial intelligence',
    'neural network',
    'diffusion model',
    'text-to-image',
    'image synthesis',
  ],
};

/**
 * Main AI detection function - analyzes file for AI generation indicators
 */
export async function detectAI(
  file: File
): Promise<AIDetectionResult> {
  const fileType = file.type;
  const warnings: string[] = [];

  // Extract metadata first
  const metadataAnalysis = await analyzeMetadata(file);

  // Analyze based on file type
  if (fileType.startsWith('image/')) {
    const imageAnalysis = await analyzeImage(file);

    // Calculate confidence based on multiple factors
    let confidence = 0;
    let isAIGenerated = false;

    // Metadata indicates AI (high confidence)
    if (metadataAnalysis.hasAIToolSignatures) {
      confidence += 60;
      isAIGenerated = true;
      warnings.push('File metadata contains AI tool signatures');
    }

    // Visual artifacts suggest AI
    if (imageAnalysis.hasAIArtifacts) {
      confidence += 25;
      isAIGenerated = true;
      warnings.push('Visual analysis detected AI generation patterns');
    }

    // Suspicious compression/noise patterns
    if (!imageAnalysis.compressionAnalysis.consistent) {
      confidence += 10;
      warnings.push('Inconsistent compression patterns detected');
    }

    if (!imageAnalysis.noiseAnalysis.natural) {
      confidence += 5;
      warnings.push('Unnatural noise patterns detected');
    }

    // Missing expected metadata (medium suspicion)
    if (!metadataAnalysis.metadataComplete) {
      confidence += Math.min(confidence * 0.2, 15);
      warnings.push('Expected camera/creation metadata is missing or incomplete');
    }

    confidence = Math.min(confidence, 100);

    return {
      isAIGenerated,
      confidence,
      provider: 'Origynl Multi-Factor Analysis',
      details: {
        imageAnalysis,
        metadataAnalysis,
      },
      warnings,
      timestamp: Date.now(),
    };
  } else if (
    fileType === 'application/pdf' ||
    fileType.startsWith('text/')
  ) {
    const textAnalysis = await analyzeText(file);

    let confidence = 0;
    let isAIGenerated = false;

    if (metadataAnalysis.hasAIToolSignatures) {
      confidence += 70;
      isAIGenerated = true;
      warnings.push('Document metadata contains AI tool signatures');
    }

    if (textAnalysis.hasAIPatterns) {
      confidence += 30;
      isAIGenerated = true;
      warnings.push('Text patterns consistent with AI generation');
    }

    confidence = Math.min(confidence, 100);

    return {
      isAIGenerated,
      confidence,
      provider: 'Origynl Multi-Factor Analysis',
      details: {
        textAnalysis,
        metadataAnalysis,
      },
      warnings,
      timestamp: Date.now(),
    };
  }

  // Generic file - only metadata analysis
  return {
    isAIGenerated: metadataAnalysis.hasAIToolSignatures,
    confidence: metadataAnalysis.hasAIToolSignatures ? 80 : 20,
    provider: 'Origynl Metadata Analysis',
    details: {
      metadataAnalysis,
    },
    warnings: metadataAnalysis.hasAIToolSignatures
      ? ['File metadata contains AI tool signatures']
      : ['Limited analysis - file type not fully supported'],
    timestamp: Date.now(),
  };
}

/**
 * Analyze image for AI generation indicators
 */
async function analyzeImage(file: File): Promise<ImageAnalysis> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Get image data for analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Perform various analyses
        const compressionAnalysis = analyzeCompression(imageData);
        const noiseAnalysis = analyzeNoise(imageData);
        const patternAnalysis = detectAIPatterns(imageData);

        resolve({
          hasAIArtifacts: patternAnalysis.length > 0,
          suspiciousPatterns: patternAnalysis,
          compressionAnalysis,
          noiseAnalysis,
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Analyze compression artifacts and consistency
 */
function analyzeCompression(imageData: ImageData): {
  consistent: boolean;
  anomalies: string[];
} {
  const anomalies: string[] = [];
  const { data, width, height } = imageData;

  // Sample blocks across the image
  const blockSize = 8; // JPEG uses 8x8 blocks
  const sampleSize = Math.min(100, Math.floor((width * height) / (blockSize * blockSize)));
  const blockVariances: number[] = [];

  for (let i = 0; i < sampleSize; i++) {
    const x = Math.floor(Math.random() * (width - blockSize));
    const y = Math.floor(Math.random() * (height - blockSize));

    const blockVariance = calculateBlockVariance(data, width, x, y, blockSize);
    blockVariances.push(blockVariance);
  }

  // Calculate variance of variances
  const mean = blockVariances.reduce((a, b) => a + b, 0) / blockVariances.length;
  const variance =
    blockVariances.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
    blockVariances.length;
  const stdDev = Math.sqrt(variance);

  // AI-generated images often have more uniform compression
  if (stdDev < mean * 0.2) {
    anomalies.push('Unusually uniform compression across image');
  }

  // Check for perfect blocks (common in AI generation)
  const perfectBlocks = blockVariances.filter((v) => v === 0).length;
  if (perfectBlocks > sampleSize * 0.1) {
    anomalies.push('High number of perfectly uniform blocks detected');
  }

  return {
    consistent: anomalies.length === 0,
    anomalies,
  };
}

/**
 * Calculate variance within an image block
 */
function calculateBlockVariance(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  blockSize: number
): number {
  const values: number[] = [];

  for (let by = 0; by < blockSize; by++) {
    for (let bx = 0; bx < blockSize; bx++) {
      const idx = ((y + by) * width + (x + bx)) * 4;
      // Use luminance
      const luminance = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      values.push(luminance);
    }
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

  return variance;
}

/**
 * Analyze noise patterns in the image
 */
function analyzeNoise(imageData: ImageData): {
  natural: boolean;
  artificialPatterns: string[];
} {
  const artificialPatterns: string[] = [];
  const { data, width, height } = imageData;

  // Sample random pixels and their neighbors
  const sampleSize = Math.min(1000, width * height);
  const noiseValues: number[] = [];

  for (let i = 0; i < sampleSize; i++) {
    const x = 1 + Math.floor(Math.random() * (width - 2));
    const y = 1 + Math.floor(Math.random() * (height - 2));

    const idx = (y * width + x) * 4;
    const centerLum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

    // Calculate average of neighbors
    let neighborSum = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nIdx = ((y + dy) * width + (x + dx)) * 4;
        const nLum = 0.299 * data[nIdx] + 0.587 * data[nIdx + 1] + 0.114 * data[nIdx + 2];
        neighborSum += nLum;
      }
    }
    const neighborAvg = neighborSum / 8;

    noiseValues.push(Math.abs(centerLum - neighborAvg));
  }

  // Natural noise has certain statistical properties
  const mean = noiseValues.reduce((a, b) => a + b, 0) / noiseValues.length;
  const variance =
    noiseValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / noiseValues.length;
  const stdDev = Math.sqrt(variance);

  // AI-generated images often have too little noise or too uniform noise
  if (mean < 2) {
    artificialPatterns.push('Noise level suspiciously low (overly smooth)');
  }

  if (stdDev < mean * 0.3) {
    artificialPatterns.push('Noise distribution too uniform');
  }

  return {
    natural: artificialPatterns.length === 0,
    artificialPatterns,
  };
}

/**
 * Detect specific AI generation patterns
 */
function detectAIPatterns(imageData: ImageData): string[] {
  const patterns: string[] = [];
  const { data, width, height } = imageData;

  // Check for symmetric patterns (common in diffusion models)
  const symmetryScore = checkSymmetry(data, width, height);
  if (symmetryScore > 0.85) {
    patterns.push('High symmetry detected (common in AI-generated images)');
  }

  // Check for repetitive patterns
  const repetitionScore = checkRepetition(data, width, height);
  if (repetitionScore > 0.7) {
    patterns.push('Repetitive patterns detected');
  }

  return patterns;
}

/**
 * Check for symmetric patterns in the image
 */
function checkSymmetry(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number {
  let matchCount = 0;
  let totalCount = 0;
  const sampleSize = Math.min(500, (width * height) / 2);

  for (let i = 0; i < sampleSize; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const mirrorX = width - 1 - x;

    const idx1 = (y * width + x) * 4;
    const idx2 = (y * width + mirrorX) * 4;

    const diff =
      Math.abs(data[idx1] - data[idx2]) +
      Math.abs(data[idx1 + 1] - data[idx2 + 1]) +
      Math.abs(data[idx1 + 2] - data[idx2 + 2]);

    if (diff < 30) matchCount++;
    totalCount++;
  }

  return matchCount / totalCount;
}

/**
 * Check for repetitive patterns
 */
function checkRepetition(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number {
  // Sample small patches and look for duplicates
  const patchSize = 4;
  const patches = new Map<string, number>();
  const sampleSize = Math.min(200, (width * height) / (patchSize * patchSize));

  for (let i = 0; i < sampleSize; i++) {
    const x = Math.floor(Math.random() * (width - patchSize));
    const y = Math.floor(Math.random() * (height - patchSize));

    const patchHash = hashPatch(data, width, x, y, patchSize);
    patches.set(patchHash, (patches.get(patchHash) || 0) + 1);
  }

  // Calculate repetition score
  let duplicateCount = 0;
  patches.forEach((count) => {
    if (count > 1) duplicateCount += count - 1;
  });

  return duplicateCount / sampleSize;
}

/**
 * Create a simple hash of an image patch
 */
function hashPatch(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  size: number
): string {
  const values: number[] = [];
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = ((y + py) * width + (x + px)) * 4;
      values.push(Math.floor(data[idx] / 32)); // Reduce precision for matching
    }
  }
  return values.join(',');
}

/**
 * Analyze metadata for AI tool signatures
 */
async function analyzeMetadata(file: File): Promise<MetadataAnalysis> {
  const detectedTools: string[] = [];
  const suspiciousFields: string[] = [];
  let hasAIToolSignatures = false;
  let metadataComplete = false;

  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    // Use existing EXIF extraction
    const metadata = await extractEXIF(file);

    if (metadata) {
      metadataComplete = !!(
        metadata.Make ||
        metadata.Model ||
        metadata.DateTime
      );

      // Check all metadata fields for AI signatures
      Object.entries(metadata).forEach(([key, value]) => {
        const valueStr = String(value).toLowerCase();

        // Check software signatures
        AI_TOOL_SIGNATURES.software.forEach((tool) => {
          if (valueStr.includes(tool)) {
            detectedTools.push(tool);
            hasAIToolSignatures = true;
          }
        });

        // Check generator signatures
        AI_TOOL_SIGNATURES.generators.forEach((gen) => {
          if (valueStr.includes(gen)) {
            suspiciousFields.push(`${key}: ${value}`);
            hasAIToolSignatures = true;
          }
        });
      });

      // Specific suspicious patterns
      if (metadata.Software?.toLowerCase().includes('ai')) {
        suspiciousFields.push('Software field contains "AI"');
      }

      // Missing camera data is suspicious for "photos"
      if (!metadata.Make && !metadata.Model && file.name.match(/\.(jpg|jpeg)$/i)) {
        suspiciousFields.push('No camera manufacturer or model found');
      }
    }
  } else if (file.type === 'application/pdf') {
    // PDF metadata extraction
    const metadata = await extractPDFMetadata(file);

    if (metadata) {
      metadataComplete = !!(metadata.Creator || metadata.Producer);

      Object.entries(metadata).forEach(([key, value]) => {
        const valueStr = String(value).toLowerCase();

        AI_TOOL_SIGNATURES.software.forEach((tool) => {
          if (valueStr.includes(tool)) {
            detectedTools.push(tool);
            hasAIToolSignatures = true;
          }
        });

        AI_TOOL_SIGNATURES.generators.forEach((gen) => {
          if (valueStr.includes(gen)) {
            suspiciousFields.push(`${key}: ${value}`);
            hasAIToolSignatures = true;
          }
        });
      });
    }
  }

  return {
    hasAIToolSignatures,
    detectedTools: [...new Set(detectedTools)], // Remove duplicates
    metadataComplete,
    suspiciousFields,
  };
}

/**
 * Extract EXIF data from JPEG
 */
async function extractEXIF(file: File): Promise<Record<string, any> | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // @ts-ignore - piexifjs is loaded globally
        if (typeof piexif !== 'undefined') {
          const exifData = piexif.load(e.target?.result as string);
          const metadata: Record<string, any> = {};

          // Extract all EXIF tags
          Object.keys(exifData).forEach((ifd) => {
            if (ifd === 'thumbnail') return;
            Object.keys(exifData[ifd]).forEach((tag) => {
              const tagName = piexif.TAGS[ifd][tag]?.name || tag;
              metadata[tagName] = exifData[ifd][tag];
            });
          });

          resolve(metadata);
        } else {
          resolve(null);
        }
      } catch (error) {
        resolve(null);
      }
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Extract PDF metadata
 */
async function extractPDFMetadata(
  file: File
): Promise<Record<string, any> | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // @ts-ignore - pdf-lib import
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(uint8Array);

    const metadata: Record<string, any> = {
      Title: pdfDoc.getTitle(),
      Author: pdfDoc.getAuthor(),
      Subject: pdfDoc.getSubject(),
      Creator: pdfDoc.getCreator(),
      Producer: pdfDoc.getProducer(),
      Keywords: pdfDoc.getKeywords(),
      CreationDate: pdfDoc.getCreationDate(),
      ModificationDate: pdfDoc.getModificationDate(),
    };

    return metadata;
  } catch (error) {
    return null;
  }
}

/**
 * Analyze text for AI-generated patterns
 */
async function analyzeText(file: File): Promise<TextAnalysis> {
  const suspiciousPatterns: string[] = [];
  let hasAIPatterns = false;

  try {
    const text = await file.text();

    // Basic text analysis
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.trim().length > 0);

    // AI-generated text often has very consistent sentence lengths
    if (sentences.length > 5) {
      const sentenceLengths = sentences.map((s) => s.split(/\s+/).length);
      const avgLength =
        sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
      const variance =
        sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) /
        sentenceLengths.length;
      const stdDev = Math.sqrt(variance);

      // Low variance suggests AI
      if (stdDev < avgLength * 0.3) {
        suspiciousPatterns.push('Unusually consistent sentence lengths');
        hasAIPatterns = true;
      }
    }

    // Check for common AI patterns
    const aiPhrases = [
      'as an ai',
      'as a language model',
      'i don\'t have personal',
      'i\'m just an ai',
      'i cannot',
      'it\'s important to note',
      'it is important to note',
    ];

    const lowerText = text.toLowerCase();
    aiPhrases.forEach((phrase) => {
      if (lowerText.includes(phrase)) {
        suspiciousPatterns.push(`Contains AI-typical phrase: "${phrase}"`);
        hasAIPatterns = true;
      }
    });

    // Overly formal or consistent tone (simplified check)
    const formalWords = [
      'moreover',
      'furthermore',
      'nevertheless',
      'consequently',
      'subsequently',
    ];
    const formalCount = formalWords.filter((word) => lowerText.includes(word)).length;

    if (formalCount > words.length / 100) {
      suspiciousPatterns.push('Unusually high use of formal transition words');
      hasAIPatterns = true;
    }

    return {
      hasAIPatterns,
      suspiciousPatterns,
    };
  } catch (error) {
    return {
      hasAIPatterns: false,
      suspiciousPatterns: ['Could not analyze text content'],
    };
  }
}
