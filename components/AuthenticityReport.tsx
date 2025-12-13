/**
 * Authenticity Report Component
 * Displays comprehensive verification results with AI detection and multi-factor scoring
 */

import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Bot,
  Database,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AuthenticityScore } from '../services/authenticityService';

interface Props {
  score: AuthenticityScore;
  fileName?: string;
  blockchainTxHash?: string;
  blockchainTimestamp?: number;
  isSimulation?: boolean;
}

export const AuthenticityReport: React.FC<Props> = ({
  score,
  fileName,
  blockchainTxHash,
  blockchainTimestamp,
  isSimulation,
}) => {
  const [expandedSections, setExpandedSections] = React.useState<{
    [key: string]: boolean;
  }>({
    blockchain: true,
    aiDetection: true,
    metadata: true,
    forensics: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Determine background color based on authenticity level
  const bgColor = {
    AUTHENTIC: 'bg-green-50',
    LIKELY_AUTHENTIC: 'bg-green-50/50',
    UNCERTAIN: 'bg-yellow-50',
    LIKELY_FAKE: 'bg-orange-50',
    FAKE: 'bg-red-50',
  }[score.level];

  const borderColor = {
    AUTHENTIC: 'border-green-600',
    LIKELY_AUTHENTIC: 'border-green-400',
    UNCERTAIN: 'border-yellow-500',
    LIKELY_FAKE: 'border-orange-500',
    FAKE: 'border-red-600',
  }[score.level];

  const headerIcon = {
    AUTHENTIC: <ShieldCheck className="text-green-600" size={24} />,
    LIKELY_AUTHENTIC: <CheckCircle className="text-green-500" size={24} />,
    UNCERTAIN: <AlertCircle className="text-yellow-500" size={24} />,
    LIKELY_FAKE: <AlertTriangle className="text-orange-500" size={24} />,
    FAKE: <XCircle className="text-red-600" size={24} />,
  }[score.level];

  const levelText = {
    AUTHENTIC: 'Verified Authentic',
    LIKELY_AUTHENTIC: 'Likely Authentic',
    UNCERTAIN: 'Authenticity Uncertain',
    LIKELY_FAKE: 'Likely AI-Generated / Fake',
    FAKE: 'AI-Generated / Fake',
  }[score.level];

  return (
    <div className={`${bgColor} border-t-4 ${borderColor} p-6 md:p-8 shadow-2xl`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          {headerIcon}
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-neutral-900">
            {levelText}
          </h2>
        </div>

        {fileName && (
          <p className="text-sm text-neutral-600 mb-2">File: {fileName}</p>
        )}

        <p className="text-sm text-neutral-700 leading-relaxed">{score.summary}</p>
      </div>

      {/* Overall Authenticity Score */}
      <div className="mb-6 bg-white/50 p-4 rounded-lg border border-neutral-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-600">
            Authenticity Score
          </span>
          <span className={`text-2xl font-bold ${getScoreTextColor(score.overall)}`}>
            {score.overall}/100
          </span>
        </div>

        {/* Score bar */}
        <div className="relative h-3 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 transition-all duration-1000 ease-out rounded-full"
            style={{
              width: `${score.overall}%`,
              backgroundColor: getScoreBarColor(score.overall),
            }}
          />
        </div>

        {/* Score legend */}
        <div className="flex justify-between mt-2 text-[9px] text-neutral-500 uppercase tracking-wide">
          <span>Fake</span>
          <span>Uncertain</span>
          <span>Authentic</span>
        </div>
      </div>

      {/* Risk Factors */}
      {score.riskFactors.length > 0 && (
        <div className="mb-6 bg-white/70 border border-orange-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-orange-600" size={16} />
            <h3 className="font-bold text-sm uppercase tracking-wide text-orange-900">
              Risk Factors Detected
            </h3>
          </div>
          <ul className="space-y-2">
            {score.riskFactors.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-orange-800">
                <span className="text-orange-600 mt-0.5">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Factor Breakdown */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm uppercase tracking-wide text-neutral-700 mb-4">
          Detailed Analysis
        </h3>

        {/* Blockchain Verification */}
        <FactorCard
          title="Blockchain Verification"
          icon={<Database size={18} />}
          score={score.factors.blockchain}
          expanded={expandedSections.blockchain}
          onToggle={() => toggleSection('blockchain')}
          blockchainTxHash={blockchainTxHash}
          isSimulation={isSimulation}
        />

        {/* AI Detection */}
        <FactorCard
          title="AI Content Detection"
          icon={<Bot size={18} />}
          score={score.factors.aiDetection}
          expanded={expandedSections.aiDetection}
          onToggle={() => toggleSection('aiDetection')}
        />

        {/* Metadata Analysis */}
        <FactorCard
          title="Metadata Analysis"
          icon={<FileText size={18} />}
          score={score.factors.metadata}
          expanded={expandedSections.metadata}
          onToggle={() => toggleSection('metadata')}
        />

        {/* Forensic Analysis */}
        <FactorCard
          title="Forensic Analysis"
          icon={<ImageIcon size={18} />}
          score={score.factors.forensics}
          expanded={expandedSections.forensics}
          onToggle={() => toggleSection('forensics')}
        />
      </div>

      {/* Recommendations */}
      {score.recommendations.length > 0 && (
        <div className="mt-6 bg-white/70 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Info className="text-blue-600" size={16} />
            <h3 className="font-bold text-sm uppercase tracking-wide text-blue-900">
              Recommendations
            </h3>
          </div>
          <ul className="space-y-2">
            {score.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-blue-800">
                <span className="text-blue-600 mt-0.5">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-6 pt-4 border-t border-neutral-200 text-center">
        <p className="text-xs text-neutral-500">
          Analysis completed on {new Date(score.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

interface FactorCardProps {
  title: string;
  icon: React.ReactNode;
  score: {
    score: number;
    weight: number;
    status: 'PASS' | 'WARN' | 'FAIL' | 'N/A';
    details: string[];
  };
  expanded: boolean;
  onToggle: () => void;
  blockchainTxHash?: string;
  isSimulation?: boolean;
}

const FactorCard: React.FC<FactorCardProps> = ({
  title,
  icon,
  score,
  expanded,
  onToggle,
  blockchainTxHash,
  isSimulation,
}) => {
  const statusColor = {
    PASS: 'bg-green-100 text-green-700 border-green-300',
    WARN: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    FAIL: 'bg-red-100 text-red-700 border-red-300',
    'N/A': 'bg-neutral-100 text-neutral-600 border-neutral-300',
  }[score.status];

  const statusIcon = {
    PASS: <CheckCircle size={14} />,
    WARN: <AlertCircle size={14} />,
    FAIL: <XCircle size={14} />,
    'N/A': <Info size={14} />,
  }[score.status];

  return (
    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-neutral-600">{icon}</div>
          <div className="text-left">
            <h4 className="font-bold text-sm text-neutral-900">{title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-neutral-500">
                Weight: {Math.round(score.weight * 100)}%
              </span>
              <span className="text-neutral-300">•</span>
              <span className={`text-xs font-bold ${getScoreTextColor(score.score)}`}>
                {score.score}/100
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${statusColor}`}
          >
            {statusIcon}
            <span>{score.status}</span>
          </div>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Details */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-neutral-100 bg-neutral-50/50">
          <ul className="space-y-2">
            {score.details.map((detail, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-neutral-700">
                <span className="text-neutral-400 mt-0.5 font-mono text-xs">
                  {detail.startsWith('✓')
                    ? '✓'
                    : detail.startsWith('✗')
                    ? '✗'
                    : detail.startsWith('⚠')
                    ? '⚠'
                    : 'ⓘ'}
                </span>
                <span className="leading-relaxed">
                  {detail.replace(/^[✓✗⚠ⓘ]\s*/, '')}
                </span>
              </li>
            ))}
          </ul>

          {/* Blockchain explorer link */}
          {blockchainTxHash && !isSimulation && title.includes('Blockchain') && (
            <div className="mt-4 pt-3 border-t border-neutral-200">
              <a
                href={`https://amoy.polygonscan.com/tx/${blockchainTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-orange-600 hover:text-orange-700 font-bold uppercase tracking-wide"
              >
                <span>View on Blockchain Explorer</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function getScoreTextColor(score: number): string {
  if (score >= 85) return 'text-green-600';
  if (score >= 70) return 'text-green-500';
  if (score >= 50) return 'text-yellow-500';
  if (score >= 30) return 'text-orange-500';
  return 'text-red-600';
}

function getScoreBarColor(score: number): string {
  if (score >= 85) return '#10b981'; // green
  if (score >= 70) return '#84cc16'; // light green
  if (score >= 50) return '#eab308'; // yellow
  if (score >= 30) return '#f97316'; // orange
  return '#ef4444'; // red
}
