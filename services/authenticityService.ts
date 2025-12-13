/**
 * Authenticity Scoring Service
 * Multi-factor analysis combining blockchain, AI detection, metadata, and forensics
 */

import { AIDetectionResult, detectAI } from './aiDetectionService';

export interface AuthenticityScore {
  overall: number; // 0-100 (100 = most likely authentic, 0 = most likely fake/AI)
  level: 'AUTHENTIC' | 'LIKELY_AUTHENTIC' | 'UNCERTAIN' | 'LIKELY_FAKE' | 'FAKE';
  color: 'green' | 'lightgreen' | 'yellow' | 'orange' | 'red';
  factors: {
    blockchain: FactorScore;
    aiDetection: FactorScore;
    metadata: FactorScore;
    forensics: FactorScore;
  };
  summary: string;
  recommendations: string[];
  riskFactors: string[];
  timestamp: number;
}

export interface FactorScore {
  score: number; // 0-100
  weight: number; // Weight in overall calculation
  status: 'PASS' | 'WARN' | 'FAIL' | 'N/A';
  details: string[];
}

export interface AuthenticityAnalysis {
  file: File;
  blockchainVerified: boolean;
  blockchainTimestamp?: number;
  aiDetectionResult?: AIDetectionResult;
  authenticityScore: AuthenticityScore;
}

/**
 * Perform comprehensive authenticity analysis
 */
export async function analyzeAuthenticity(
  file: File,
  blockchainVerified: boolean,
  blockchainTimestamp?: number
): Promise<AuthenticityAnalysis> {
  // Run AI detection
  const aiDetectionResult = await detectAI(file);

  // Calculate individual factor scores
  const blockchainScore = calculateBlockchainScore(
    blockchainVerified,
    blockchainTimestamp
  );
  const aiDetectionScore = calculateAIDetectionScore(aiDetectionResult);
  const metadataScore = calculateMetadataScore(aiDetectionResult);
  const forensicsScore = calculateForensicsScore(aiDetectionResult);

  // Calculate weighted overall score
  const overall = Math.round(
    blockchainScore.score * blockchainScore.weight +
      aiDetectionScore.score * aiDetectionScore.weight +
      metadataScore.score * metadataScore.weight +
      forensicsScore.score * forensicsScore.weight
  );

  // Determine authenticity level
  const { level, color } = determineAuthenticityLevel(overall);

  // Generate summary and recommendations
  const { summary, recommendations, riskFactors } = generateReport(
    overall,
    level,
    blockchainScore,
    aiDetectionScore,
    metadataScore,
    forensicsScore,
    aiDetectionResult
  );

  const authenticityScore: AuthenticityScore = {
    overall,
    level,
    color,
    factors: {
      blockchain: blockchainScore,
      aiDetection: aiDetectionScore,
      metadata: metadataScore,
      forensics: forensicsScore,
    },
    summary,
    recommendations,
    riskFactors,
    timestamp: Date.now(),
  };

  return {
    file,
    blockchainVerified,
    blockchainTimestamp,
    aiDetectionResult,
    authenticityScore,
  };
}

/**
 * Calculate blockchain verification score
 */
function calculateBlockchainScore(
  verified: boolean,
  timestamp?: number
): FactorScore {
  const weight = 0.4; // 40% of total score
  const details: string[] = [];

  if (verified && timestamp) {
    const certDate = new Date(timestamp * 1000);
    const age = Date.now() - certDate.getTime();
    const daysOld = Math.floor(age / (1000 * 60 * 60 * 24));

    details.push(`✓ Certified on blockchain: ${certDate.toLocaleString()}`);
    details.push(`✓ Certificate age: ${daysOld} days`);
    details.push('✓ File hash matches blockchain record');
    details.push('✓ Tamper-proof verification passed');

    return {
      score: 100,
      weight,
      status: 'PASS',
      details,
    };
  } else if (verified && !timestamp) {
    details.push('✓ Hash exists on blockchain');
    details.push('⚠ Timestamp information not available');

    return {
      score: 85,
      weight,
      status: 'WARN',
      details,
    };
  } else {
    details.push('✗ No blockchain certification found');
    details.push('⚠ File authenticity cannot be verified via blockchain');
    details.push('ⓘ Consider certifying this file for future verification');

    return {
      score: 0,
      weight,
      status: 'FAIL',
      details,
    };
  }
}

/**
 * Calculate AI detection score (inverse - lower AI probability = higher score)
 */
function calculateAIDetectionScore(result: AIDetectionResult): FactorScore {
  const weight = 0.3; // 30% of total score
  const details: string[] = [];

  if (result.isAIGenerated) {
    const score = Math.max(0, 100 - result.confidence);

    details.push(`✗ AI generation detected with ${result.confidence}% confidence`);
    details.push(`ⓘ Analysis by: ${result.provider}`);

    result.warnings.forEach((warning) => {
      details.push(`⚠ ${warning}`);
    });

    // Add specific detection details
    if (result.details.metadataAnalysis?.hasAIToolSignatures) {
      details.push(
        `✗ AI tools detected: ${result.details.metadataAnalysis.detectedTools.join(', ')}`
      );
    }

    if (result.details.imageAnalysis?.hasAIArtifacts) {
      details.push('✗ Visual AI artifacts detected in image');
    }

    if (result.details.textAnalysis?.hasAIPatterns) {
      details.push('✗ Text patterns consistent with AI generation');
    }

    return {
      score,
      weight,
      status: result.confidence > 70 ? 'FAIL' : 'WARN',
      details,
    };
  } else {
    const score = Math.min(100, 100 - result.confidence);

    details.push(`✓ No strong AI generation indicators found`);
    details.push(`ⓘ Confidence: ${100 - result.confidence}% likely authentic`);

    if (result.warnings.length > 0) {
      result.warnings.forEach((warning) => {
        details.push(`ⓘ ${warning}`);
      });
    } else {
      details.push('✓ All AI detection checks passed');
    }

    return {
      score,
      weight,
      status: result.confidence > 20 ? 'WARN' : 'PASS',
      details,
    };
  }
}

/**
 * Calculate metadata authenticity score
 */
function calculateMetadataScore(result: AIDetectionResult): FactorScore {
  const weight = 0.2; // 20% of total score
  const details: string[] = [];

  const metadataAnalysis = result.details.metadataAnalysis;

  if (!metadataAnalysis) {
    details.push('ⓘ Metadata analysis not available for this file type');
    return {
      score: 50,
      weight,
      status: 'N/A',
      details,
    };
  }

  let score = 100;

  // AI tool signatures are a major red flag
  if (metadataAnalysis.hasAIToolSignatures) {
    score -= 60;
    details.push('✗ AI tool signatures found in metadata');
    metadataAnalysis.detectedTools.forEach((tool) => {
      details.push(`  • ${tool}`);
    });
  } else {
    details.push('✓ No AI tool signatures in metadata');
  }

  // Incomplete metadata is suspicious
  if (!metadataAnalysis.metadataComplete) {
    score -= 25;
    details.push('⚠ Expected metadata fields are missing or incomplete');
    details.push('  • Camera/device information not found');
  } else {
    details.push('✓ Complete metadata present');
    details.push('✓ Camera/device information verified');
  }

  // Suspicious fields
  if (metadataAnalysis.suspiciousFields.length > 0) {
    score -= 15;
    details.push('⚠ Suspicious metadata fields detected:');
    metadataAnalysis.suspiciousFields.forEach((field) => {
      details.push(`  • ${field}`);
    });
  } else {
    details.push('✓ No suspicious metadata patterns');
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    weight,
    status:
      metadataAnalysis.hasAIToolSignatures
        ? 'FAIL'
        : !metadataAnalysis.metadataComplete
        ? 'WARN'
        : 'PASS',
    details,
  };
}

/**
 * Calculate forensics score (image analysis)
 */
function calculateForensicsScore(result: AIDetectionResult): FactorScore {
  const weight = 0.1; // 10% of total score
  const details: string[] = [];

  const imageAnalysis = result.details.imageAnalysis;

  if (!imageAnalysis) {
    details.push('ⓘ Forensic analysis not available for this file type');
    return {
      score: 50,
      weight,
      status: 'N/A',
      details,
    };
  }

  let score = 100;

  // AI artifacts
  if (imageAnalysis.hasAIArtifacts) {
    score -= 40;
    details.push('✗ AI generation artifacts detected');
    imageAnalysis.suspiciousPatterns.forEach((pattern) => {
      details.push(`  • ${pattern}`);
    });
  } else {
    details.push('✓ No AI artifacts detected');
  }

  // Compression analysis
  if (!imageAnalysis.compressionAnalysis.consistent) {
    score -= 30;
    details.push('⚠ Compression inconsistencies detected:');
    imageAnalysis.compressionAnalysis.anomalies.forEach((anomaly) => {
      details.push(`  • ${anomaly}`);
    });
  } else {
    details.push('✓ Compression patterns appear natural');
  }

  // Noise analysis
  if (!imageAnalysis.noiseAnalysis.natural) {
    score -= 30;
    details.push('⚠ Unnatural noise patterns:');
    imageAnalysis.noiseAnalysis.artificialPatterns.forEach((pattern) => {
      details.push(`  • ${pattern}`);
    });
  } else {
    details.push('✓ Natural noise distribution');
  }

  if (score === 100) {
    details.push('✓ All forensic checks passed');
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    weight,
    status: imageAnalysis.hasAIArtifacts ? 'FAIL' : score < 70 ? 'WARN' : 'PASS',
    details,
  };
}

/**
 * Determine authenticity level based on score
 */
function determineAuthenticityLevel(score: number): {
  level: AuthenticityScore['level'];
  color: AuthenticityScore['color'];
} {
  if (score >= 85) {
    return { level: 'AUTHENTIC', color: 'green' };
  } else if (score >= 70) {
    return { level: 'LIKELY_AUTHENTIC', color: 'lightgreen' };
  } else if (score >= 50) {
    return { level: 'UNCERTAIN', color: 'yellow' };
  } else if (score >= 30) {
    return { level: 'LIKELY_FAKE', color: 'orange' };
  } else {
    return { level: 'FAKE', color: 'red' };
  }
}

/**
 * Generate comprehensive report
 */
function generateReport(
  overall: number,
  level: AuthenticityScore['level'],
  blockchain: FactorScore,
  aiDetection: FactorScore,
  metadata: FactorScore,
  forensics: FactorScore,
  aiResult: AIDetectionResult
): {
  summary: string;
  recommendations: string[];
  riskFactors: string[];
} {
  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  // Collect risk factors
  if (blockchain.status === 'FAIL') {
    riskFactors.push('No blockchain certification found');
  }

  if (aiDetection.status === 'FAIL') {
    riskFactors.push(
      `AI generation detected with ${aiResult.confidence}% confidence`
    );
  }

  if (metadata.status === 'FAIL') {
    riskFactors.push('AI tool signatures found in metadata');
  }

  if (metadata.status === 'WARN') {
    riskFactors.push('Missing or incomplete metadata');
  }

  if (forensics.status === 'FAIL') {
    riskFactors.push('Forensic analysis detected AI artifacts');
  }

  // Generate recommendations
  if (!blockchain.status || blockchain.status === 'FAIL') {
    recommendations.push(
      'Certify this file on blockchain for tamper-proof verification'
    );
  }

  if (aiDetection.status === 'FAIL' || aiDetection.status === 'WARN') {
    recommendations.push(
      'Request original source file with complete metadata'
    );
    recommendations.push(
      'Verify with content creator using alternative channels'
    );
  }

  if (metadata.status === 'WARN' || metadata.status === 'FAIL') {
    recommendations.push(
      'Examine original capture device or creation software'
    );
  }

  if (level === 'FAKE' || level === 'LIKELY_FAKE') {
    recommendations.push('Do not use this file for official purposes');
    recommendations.push('Consider this file as potentially AI-generated or manipulated');
  }

  if (level === 'UNCERTAIN') {
    recommendations.push('Request additional verification from the source');
    recommendations.push('Use caution when relying on this file');
  }

  if (level === 'AUTHENTIC' && blockchain.status === 'PASS') {
    recommendations.push('File has passed all authenticity checks');
    recommendations.push('Safe to use for official purposes');
  }

  // Generate summary
  let summary = '';

  switch (level) {
    case 'AUTHENTIC':
      summary = `This file appears to be authentic with high confidence (${overall}/100). ${
        blockchain.status === 'PASS'
          ? 'It is certified on blockchain and shows no signs of AI generation or manipulation.'
          : 'It shows no signs of AI generation or manipulation.'
      }`;
      break;

    case 'LIKELY_AUTHENTIC':
      summary = `This file is likely authentic (${overall}/100), but some minor concerns were detected. ${
        riskFactors.length > 0
          ? 'Review the risk factors for details.'
          : 'It shows minimal signs of concern.'
      }`;
      break;

    case 'UNCERTAIN':
      summary = `The authenticity of this file is uncertain (${overall}/100). Multiple factors require further investigation. Exercise caution when using this file.`;
      break;

    case 'LIKELY_FAKE':
      summary = `This file is likely AI-generated or manipulated (${overall}/100). Significant indicators of artificial content were detected. Not recommended for official use.`;
      break;

    case 'FAKE':
      summary = `This file appears to be AI-generated or heavily manipulated (${overall}/100). Strong evidence of artificial content detected. Do not use for official purposes.`;
      break;
  }

  return { summary, recommendations, riskFactors };
}

/**
 * Get color for score visualization
 */
export function getScoreColor(score: number): string {
  if (score >= 85) return '#10b981'; // green
  if (score >= 70) return '#84cc16'; // light green
  if (score >= 50) return '#eab308'; // yellow
  if (score >= 30) return '#f97316'; // orange
  return '#ef4444'; // red
}

/**
 * Get badge text for authenticity level
 */
export function getAuthenticityBadge(level: AuthenticityScore['level']): {
  text: string;
  emoji: string;
} {
  switch (level) {
    case 'AUTHENTIC':
      return { text: 'AUTHENTIC', emoji: '✓' };
    case 'LIKELY_AUTHENTIC':
      return { text: 'LIKELY AUTHENTIC', emoji: '✓' };
    case 'UNCERTAIN':
      return { text: 'UNCERTAIN', emoji: '?' };
    case 'LIKELY_FAKE':
      return { text: 'LIKELY FAKE', emoji: '⚠' };
    case 'FAKE':
      return { text: 'AI GENERATED / FAKE', emoji: '✗' };
  }
}
