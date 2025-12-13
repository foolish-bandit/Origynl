/**
 * QR Scanner Component
 * Scans QR codes from webcam or file upload
 */

import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, X, Loader2, CheckCircle } from 'lucide-react';
import { scanQRCodeFromFile, scanQRCodeFromVideo, QRCodeData } from '../services/qrCodeService';

interface Props {
  onScan: (data: QRCodeData) => void;
  onClose?: () => void;
}

export const QRScanner: React.FC<Props> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'camera' | 'upload' | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setMode('camera');
    setError(null);
    setScanning(true);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();

        // Start scanning
        scanQRCodeFromVideo(
          videoRef.current,
          (data) => {
            // Found QR code
            setScanning(false);
            onScan(data);

            // Stop camera
            if (mediaStream) {
              mediaStream.getTracks().forEach((track) => track.stop());
            }
          },
          () => {
            setError('Failed to scan QR code');
            setScanning(false);
          }
        );
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      setError('Camera access denied. Please allow camera permissions.');
      setScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMode('upload');
    setError(null);
    setScanning(true);

    try {
      const qrData = await scanQRCodeFromFile(file);

      if (qrData) {
        setScanning(false);
        onScan(qrData);
      } else {
        setError('No QR code found in image');
        setScanning(false);
      }
    } catch (err) {
      console.error('QR scan failed:', err);
      setError('Failed to scan QR code from image');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setMode(null);
    setScanning(false);
    setError(null);
  };

  return (
    <div className="relative bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800">
        <h3 className="font-bold text-white">Scan QR Code</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-neutral-400" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {!mode && (
          <div className="space-y-4">
            <p className="text-neutral-400 text-sm text-center mb-6">
              Scan a verification QR code to instantly check document authenticity
            </p>

            <button
              onClick={startCamera}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-bold"
            >
              <Camera size={20} />
              <span>Scan with Camera</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-neutral-700 text-white rounded-lg hover:bg-neutral-800 transition-colors font-bold"
            >
              <Upload size={20} />
              <span>Upload QR Image</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {mode === 'camera' && (
          <div className="space-y-4">
            {/* Video preview */}
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />

              {/* Scanning overlay */}
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="relative">
                    {/* Scanning frame */}
                    <div className="w-64 h-64 border-4 border-orange-500 rounded-lg relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white"></div>

                      {/* Scanning line animation */}
                      <div className="absolute inset-x-0 h-1 bg-orange-500 shadow-lg shadow-orange-500/50 animate-scan"></div>
                    </div>

                    {/* Text */}
                    <p className="text-white text-center mt-4 font-bold">
                      Point camera at QR code
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Cancel button */}
            <button
              onClick={stopCamera}
              className="w-full px-6 py-3 border-2 border-neutral-700 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {mode === 'upload' && scanning && (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-orange-600 mx-auto mb-4 animate-spin" />
            <p className="text-neutral-400">Scanning image...</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-4 bg-red-950/50 border border-red-900 rounded-lg">
            <p className="text-red-400 text-sm text-center">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setMode(null);
              }}
              className="mt-3 w-full px-4 py-2 bg-red-900 text-white rounded hover:bg-red-800 transition-colors text-sm font-bold"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-950">
        <p className="text-xs text-neutral-500 text-center">
          Tip: Make sure the QR code is clearly visible and well-lit
        </p>
      </div>
    </div>
  );
};
