/**
 * Advanced Text Forensics Service
 * Implements sophisticated text analysis including normalized burstiness,
 * perplexity analysis, and hallucination detection
 */

export interface TextForensicsResult {
  burstiness: number; // 0-1, higher = more human-like variation
  perplexity: number; // Lower = more predictable (AI-like)
  normalizedBurstiness: number; // Burstiness after spell-correction
  aiLikelihood: number; // 0-100, likelihood text is AI-generated
  suspiciousPatterns: string[];
  hallucinationRisks: HallucinationResult[];
}

export interface HallucinationResult {
  entity: string;
  type: 'person' | 'organization' | 'location' | 'case_law' | 'chemical' | 'unknown';
  suspicious: boolean;
  reason: string;
}

/**
 * Perform comprehensive text forensics analysis
 */
export async function analyzeTextForensics(text: string): Promise<TextForensicsResult> {
  // Spell-correction layer for OCR errors
  const correctedText = applySpellCorrection(text);

  // Calculate raw metrics
  const rawBurstiness = calculateBurstiness(text);
  const normalizedBurstiness = calculateBurstiness(correctedText);
  const perplexity = calculatePerplexity(correctedText);

  // Detect hallucinations
  const hallucinationRisks = await detectHallucinations(correctedText);

  // Calculate AI likelihood
  const aiLikelihood = calculateAILikelihood(
    normalizedBurstiness,
    perplexity,
    hallucinationRisks
  );

  // Identify suspicious patterns
  const suspiciousPatterns = identifySuspiciousPatterns(
    text,
    correctedText,
    normalizedBurstiness,
    perplexity
  );

  return {
    burstiness: rawBurstiness,
    perplexity,
    normalizedBurstiness,
    aiLikelihood,
    suspiciousPatterns,
    hallucinationRisks,
  };
}

/**
 * Apply spell correction to account for OCR errors
 * This is a simplified version - production would use proper spell checker
 */
function applySpellCorrection(text: string): string {
  // Common OCR errors
  const ocrCorrections: { [key: string]: string } = {
    '0': 'O', // Zero to O
    '1': 'l', // One to l (in certain contexts)
    rn: 'm', // rn often misread as m
    vv: 'w', // vv often misread as w
    'cl': 'd', // cl often misread as d
  };

  let corrected = text;

  // Apply simple corrections
  Object.entries(ocrCorrections).forEach(([wrong, right]) => {
    const regex = new RegExp(`\\b${wrong}`, 'g');
    // Only apply in word contexts
    corrected = corrected.replace(regex, right);
  });

  return corrected;
}

/**
 * Calculate burstiness (sentence length variation)
 * Higher burstiness indicates human writing
 */
function calculateBurstiness(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length < 3) return 0.5;

  const lengths = sentences.map((s) => s.split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  // Normalize: human writing typically has stdDev around 30-50% of mean
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;

  // Map to 0-1 scale where 0.4-0.6 is normal human range
  const burstiness = Math.min(1, coefficientOfVariation / 0.5);

  return burstiness;
}

/**
 * Calculate perplexity (text predictability)
 * Lower perplexity suggests AI generation
 */
function calculatePerplexity(text: string): number {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length < 10) return 50; // Default for short text

  // Build simple bigram model
  const bigrams: { [key: string]: { [key: string]: number } } = {};
  const unigramCounts: { [key: string]: number } = {};

  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];

    unigramCounts[w1] = (unigramCounts[w1] || 0) + 1;

    if (!bigrams[w1]) bigrams[w1] = {};
    bigrams[w1][w2] = (bigrams[w1][w2] || 0) + 1;
  }

  // Calculate average log probability
  let totalLogProb = 0;
  let count = 0;

  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];

    if (bigrams[w1] && unigramCounts[w1]) {
      const bigramCount = bigrams[w1][w2] || 0.5; // Smoothing
      const unigramCount = unigramCounts[w1];
      const prob = bigramCount / unigramCount;

      totalLogProb += Math.log2(prob);
      count++;
    }
  }

  const avgLogProb = count > 0 ? totalLogProb / count : -10;

  // Convert to perplexity: 2^(-avg_log_prob)
  const perplexity = Math.pow(2, -avgLogProb);

  // Clamp to reasonable range
  return Math.min(200, Math.max(1, perplexity));
}

/**
 * Detect potential hallucinations by checking entities
 */
async function detectHallucinations(text: string): Promise<HallucinationResult[]> {
  const hallucinations: HallucinationResult[] = [];

  // Extract entities
  const entities = extractEntities(text);

  // Check each entity for hallucination signs
  entities.forEach((entity) => {
    const result = checkEntityValidity(entity);
    if (result.suspicious) {
      hallucinations.push(result);
    }
  });

  return hallucinations;
}

/**
 * Extract named entities from text
 * Simplified version - production would use NER library
 */
function extractEntities(text: string): Array<{
  text: string;
  type: 'person' | 'organization' | 'location' | 'case_law' | 'chemical' | 'unknown';
}> {
  const entities: Array<{
    text: string;
    type: 'person' | 'organization' | 'location' | 'case_law' | 'chemical' | 'unknown';
  }> = [];

  // Case law pattern (e.g., "Smith v. Jones", "Roe v. Wade")
  const caseLawPattern = /\b([A-Z][a-z]+)\s+v\.?\s+([A-Z][a-z]+)\b/g;
  let match;

  while ((match = caseLawPattern.exec(text)) !== null) {
    entities.push({
      text: match[0],
      type: 'case_law',
    });
  }

  // Chemical formulas (e.g., "C6H12O6", "H2O")
  const chemicalPattern = /\b[A-Z][a-z]?(\d+[A-Z][a-z]?\d*)+\b/g;
  while ((match = chemicalPattern.exec(text)) !== null) {
    entities.push({
      text: match[0],
      type: 'chemical',
    });
  }

  // Capitalized phrases (potential proper nouns)
  const properNounPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  while ((match = properNounPattern.exec(text)) !== null) {
    if (match[1].split(/\s+/).length >= 2) {
      // Multi-word proper noun
      entities.push({
        text: match[1],
        type: 'unknown',
      });
    }
  }

  return entities;
}

/**
 * Check if entity is potentially hallucinated
 */
function checkEntityValidity(entity: {
  text: string;
  type: string;
}): HallucinationResult {
  let suspicious = false;
  let reason = '';

  if (entity.type === 'case_law') {
    // Check for suspiciously generic or AI-like case names
    const genericPatterns = [
      /smith.*jones/i,
      /doe.*roe/i,
      /johnson.*williams/i,
      /example.*case/i,
    ];

    for (const pattern of genericPatterns) {
      if (pattern.test(entity.text)) {
        suspicious = true;
        reason = 'Generic or placeholder case name often used in AI-generated text';
        break;
      }
    }

    // Check for unusual formatting
    if (!entity.text.includes('v.') && !entity.text.includes('v ')) {
      suspicious = true;
      reason = 'Unusual case law formatting';
    }
  }

  if (entity.type === 'chemical') {
    // Very basic validation of chemical formulas
    const validElements = [
      'H',
      'C',
      'N',
      'O',
      'P',
      'S',
      'Cl',
      'Br',
      'F',
      'I',
      'Na',
      'K',
      'Ca',
      'Mg',
      'Fe',
      'Cu',
      'Zn',
    ];

    // Extract elements from formula
    const elementPattern = /[A-Z][a-z]?/g;
    const elements = entity.text.match(elementPattern) || [];

    const hasInvalidElement = elements.some((el) => !validElements.includes(el));

    if (hasInvalidElement) {
      suspicious = true;
      reason = 'Chemical formula contains unlikely or invalid elements';
    }

    // Check for suspiciously long formulas (possible hallucination)
    if (entity.text.length > 20) {
      suspicious = true;
      reason = 'Unusually complex chemical formula (possible hallucination)';
    }
  }

  if (entity.type === 'unknown') {
    // Check for AI-typical phrasing in entity names
    const aiTypicalWords = ['example', 'sample', 'instance', 'hypothetical', 'generic'];

    const hasAITypical = aiTypicalWords.some((word) =>
      entity.text.toLowerCase().includes(word)
    );

    if (hasAITypical) {
      suspicious = true;
      reason = 'Entity name contains AI-typical placeholder words';
    }
  }

  return {
    entity: entity.text,
    type: entity.type as any,
    suspicious,
    reason: reason || 'Entity appears valid',
  };
}

/**
 * Calculate overall AI likelihood based on metrics
 */
function calculateAILikelihood(
  burstiness: number,
  perplexity: number,
  hallucinations: HallucinationResult[]
): number {
  let score = 0;

  // Low burstiness suggests AI (weight: 30%)
  if (burstiness < 0.3) {
    score += 30;
  } else if (burstiness < 0.4) {
    score += 15;
  }

  // Low perplexity suggests AI (weight: 30%)
  if (perplexity < 20) {
    score += 30;
  } else if (perplexity < 40) {
    score += 15;
  }

  // Hallucinations strongly suggest AI (weight: 40%)
  const hallucinationCount = hallucinations.filter((h) => h.suspicious).length;
  if (hallucinationCount > 0) {
    score += Math.min(40, hallucinationCount * 20);
  }

  return Math.min(100, score);
}

/**
 * Identify suspicious patterns in text
 */
function identifySuspiciousPatterns(
  originalText: string,
  correctedText: string,
  burstiness: number,
  perplexity: number
): string[] {
  const patterns: string[] = [];

  // Check for overly consistent sentence structure
  if (burstiness < 0.25) {
    patterns.push('Extremely consistent sentence lengths (AI-typical)');
  }

  // Check for low perplexity
  if (perplexity < 15) {
    patterns.push('Very low perplexity - text is highly predictable');
  }

  // Check for excessive formal language
  const formalWords = [
    'moreover',
    'furthermore',
    'nevertheless',
    'consequently',
    'subsequently',
    'therefore',
    'thus',
    'hence',
  ];

  const words = correctedText.toLowerCase().split(/\s+/);
  const formalCount = formalWords.filter((fw) =>
    words.some((w) => w.includes(fw))
  ).length;

  if (formalCount > words.length / 50) {
    patterns.push('Excessive use of formal transition words');
  }

  // Check for AI-typical disclaimers
  const aiDisclaimers = [
    'as an ai',
    'as a language model',
    "i don't have personal",
    "i'm just an ai",
    'i cannot',
    "it's important to note",
    'it is important to note',
    'please note that',
  ];

  const lowerText = correctedText.toLowerCase();
  aiDisclaimers.forEach((disclaimer) => {
    if (lowerText.includes(disclaimer)) {
      patterns.push(`Contains AI disclaimer: "${disclaimer}"`);
    }
  });

  // Check for overly balanced paragraph structure
  const paragraphs = correctedText.split(/\n\n+/).filter((p) => p.trim().length > 0);

  if (paragraphs.length >= 3) {
    const paragraphLengths = paragraphs.map((p) => p.split(/\s+/).length);
    const avgLength =
      paragraphLengths.reduce((a, b) => a + b, 0) / paragraphLengths.length;
    const variance =
      paragraphLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) /
      paragraphLengths.length;
    const stdDev = Math.sqrt(variance);

    if (avgLength > 0 && stdDev / avgLength < 0.2) {
      patterns.push('Suspiciously uniform paragraph lengths');
    }
  }

  // Check for repetitive sentence starters
  const sentences = correctedText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const starters: { [key: string]: number } = {};
  sentences.forEach((s) => {
    const starter = s.split(/\s+/).slice(0, 2).join(' ').toLowerCase();
    starters[starter] = (starters[starter] || 0) + 1;
  });

  const maxRepeats = Math.max(...Object.values(starters));
  if (maxRepeats > sentences.length * 0.3) {
    patterns.push('Repetitive sentence starters detected');
  }

  // Check spelling correction impact
  if (originalText !== correctedText) {
    const correctionRate =
      (originalText.length - correctedText.length) / originalText.length;
    if (Math.abs(correctionRate) > 0.05) {
      patterns.push(
        'Significant OCR errors detected and corrected for analysis'
      );
    }
  }

  return patterns;
}

/**
 * Calculate entropy of text (information density)
 */
export function calculateTextEntropy(text: string): number {
  const chars = text.toLowerCase().split('');
  const freq: { [key: string]: number } = {};

  chars.forEach((char) => {
    freq[char] = (freq[char] || 0) + 1;
  });

  const total = chars.length;
  let entropy = 0;

  Object.values(freq).forEach((count) => {
    const p = count / total;
    entropy -= p * Math.log2(p);
  });

  return entropy;
}

/**
 * Detect if text is likely machine-translated
 */
export function detectMachineTranslation(text: string): {
  isLikelyMachineTranslated: boolean;
  confidence: number;
  indicators: string[];
} {
  const indicators: string[] = [];
  let score = 0;

  // Check for awkward article usage
  const awkwardArticles = text.match(/\b(a|an)\s+(the)\b/gi);
  if (awkwardArticles && awkwardArticles.length > 0) {
    indicators.push('Awkward article usage detected');
    score += 20;
  }

  // Check for word-for-word translation patterns
  const literalPatterns = [
    /\bmake\s+a\s+decision\b/gi, // vs "decide"
    /\bgive\s+a\s+speech\b/gi, // vs "speak"
    /\btake\s+a\s+look\b/gi, // vs "look"
  ];

  const literalCount = literalPatterns.filter((pattern) => pattern.test(text)).length;

  if (literalCount > 2) {
    indicators.push('Literal translation patterns detected');
    score += 15;
  }

  // Check for unnatural word order
  const unnaturalPatterns = [
    /\b(very|extremely|highly)\s+(much|so)\b/gi,
    /\bmore\s+better\b/gi,
    /\bmust\s+to\b/gi,
  ];

  const unnaturalCount = unnaturalPatterns.filter((pattern) =>
    pattern.test(text)
  ).length;

  if (unnaturalCount > 0) {
    indicators.push('Unnatural word order or grammar');
    score += 25;
  }

  return {
    isLikelyMachineTranslated: score > 30,
    confidence: Math.min(100, score),
    indicators,
  };
}
