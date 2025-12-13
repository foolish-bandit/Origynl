/**
 * Success Screen Component
 * Displays success state with celebration animations
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle, Download, Share2, QrCode, ExternalLink, ArrowRight } from 'lucide-react';
import { celebrate, confettiCannon } from '../services/celebrationService';
import { QRCodeModal } from './QRCodeModal';
import { QRCodeData } from '../services/qrCodeService';

interface Props {
  title: string;
  message: string;
  certificateUrl?: string;
  txHash?: string;
  hash?: string;
  timestamp?: number;
  onDone?: () => void;
  actions?: React.ReactNode;
}

export const SuccessScreen: React.FC<Props> = ({
  title,
  message,
  certificateUrl,
  txHash,
  hash,
  timestamp,
  onDone,
  actions,
}) => {
  const [showQR, setShowQR] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    // Fire celebration on mount
    if (!celebrating) {
      setCelebrating(true);
      setTimeout(() => {
        confettiCannon();
      }, 300);
    }
  }, [celebrating]);

  const qrData: QRCodeData = {
    type: 'verification',
    hash,
    txHash,
    timestamp,
  };

  const explorerUrl = txHash
    ? `https://polygonscan.com/tx/${txHash}`
    : undefined;

  return (
    <div className="w-full max-w-2xl mx-auto animate-scale-in">
      {/* Success Icon */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
          <div className="relative bg-green-600 rounded-full p-6">
            <CheckCircle className="w-16 h-16 text-white" strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Title & Message */}
      <div className="text-center mb-8">
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-4">
          {title}
        </h2>
        <p className="text-neutral-400 text-lg leading-relaxed max-w-xl mx-auto">
          {message}
        </p>
      </div>

      {/* Details Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-6">
        {hash && (
          <div className="mb-4">
            <label className="text-xs uppercase tracking-widest text-neutral-500 mb-2 block">
              Document Hash
            </label>
            <div className="bg-neutral-950 border border-neutral-800 rounded px-4 py-3">
              <code className="text-xs text-neutral-300 break-all font-mono">
                {hash}
              </code>
            </div>
          </div>
        )}

        {txHash && (
          <div className="mb-4">
            <label className="text-xs uppercase tracking-widest text-neutral-500 mb-2 block">
              Transaction Hash
            </label>
            <div className="bg-neutral-950 border border-neutral-800 rounded px-4 py-3 flex items-center justify-between gap-2">
              <code className="text-xs text-neutral-300 break-all font-mono">
                {txHash.slice(0, 20)}...{txHash.slice(-20)}
              </code>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-orange-500 hover:text-orange-400 transition-colors"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </div>
        )}

        {timestamp && (
          <div>
            <label className="text-xs uppercase tracking-widest text-neutral-500 mb-2 block">
              Certified On
            </label>
            <div className="text-neutral-300 text-sm">
              {new Date(timestamp).toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {certificateUrl && (
          <a
            href={certificateUrl}
            download
            className="flex items-center justify-center gap-2 px-6 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-bold"
          >
            <Download size={20} />
            <span>Download Certificate</span>
          </a>
        )}

        {(hash || txHash) && (
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-neutral-700 text-white rounded-lg hover:bg-neutral-800 transition-colors font-bold"
          >
            <QrCode size={20} />
            <span>Show QR Code</span>
          </button>
        )}

        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-neutral-700 text-white rounded-lg hover:bg-neutral-800 transition-colors font-bold"
          >
            <ExternalLink size={20} />
            <span>View on Explorer</span>
          </a>
        )}
      </div>

      {/* Custom Actions */}
      {actions && <div className="mb-6">{actions}</div>}

      {/* Done Button */}
      {onDone && (
        <div className="text-center">
          <button
            onClick={onDone}
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <span>Continue</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        data={qrData}
        title="Verification QR Code"
      />
    </div>
  );
};
