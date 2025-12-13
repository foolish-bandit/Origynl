/**
 * QR Code Modal Component
 * Displays QR code for verification with share options
 */

import React, { useEffect, useState } from 'react';
import { X, Download, Copy, Mail, Share2, Check } from 'lucide-react';
import { generateQRCode, copyVerificationUrl, downloadQRCode, QRCodeData } from '../services/qrCodeService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: QRCodeData;
  title?: string;
}

export const QRCodeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  data,
  title = 'Verification QR Code',
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      generateQRCode(data)
        .then((url) => {
          setQrCodeUrl(url);
          setLoading(false);
        })
        .catch((err) => {
          console.error('QR generation failed:', err);
          setLoading(false);
        });
    }
  }, [isOpen, data]);

  const handleCopyUrl = async () => {
    try {
      await copyVerificationUrl(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleDownload = async () => {
    try {
      await downloadQRCode(data, 'origynl-verification-qr.png');
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleShare = async () => {
    const verificationUrl = window.location.origin + '/verify?hash=' + encodeURIComponent(data.hash || data.txHash || '');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Origynl Verification',
          text: 'Verify this document on Origynl blockchain',
          url: verificationUrl,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback: copy to clipboard
      handleCopyUrl();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full p-6 animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-serif font-bold text-neutral-900 mb-2">{title}</h2>
        <p className="text-sm text-neutral-600 mb-6">
          Scan this QR code to verify the document on any device
        </p>

        {/* QR Code */}
        <div className="bg-neutral-50 border-2 border-neutral-200 rounded-lg p-6 mb-6">
          {loading ? (
            <div className="w-full aspect-square flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-neutral-200 border-t-orange-600 rounded-full animate-spin"></div>
            </div>
          ) : qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt="Verification QR Code"
              className="w-full h-auto"
            />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center text-neutral-400">
              <p>Failed to generate QR code</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            disabled={loading || !qrCodeUrl}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span className="text-sm font-bold">Download</span>
          </button>

          <button
            onClick={handleCopyUrl}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-neutral-900 text-neutral-900 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? (
              <>
                <Check size={18} className="text-green-600" />
                <span className="text-sm font-bold text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={18} />
                <span className="text-sm font-bold">Copy Link</span>
              </>
            )}
          </button>
        </div>

        {/* Share button (mobile) */}
        {navigator.share && (
          <button
            onClick={handleShare}
            disabled={loading}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Share2 size={18} />
            <span className="text-sm font-bold">Share</span>
          </button>
        )}

        {/* Info */}
        <div className="mt-6 pt-6 border-t border-neutral-200">
          <p className="text-xs text-neutral-500 text-center">
            This QR code contains a verification link that anyone can use to confirm the document's authenticity on the blockchain
          </p>
        </div>
      </div>
    </div>
  );
};
