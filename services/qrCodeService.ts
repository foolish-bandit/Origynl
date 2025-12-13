/**
 * QR Code Service
 * Generates and scans QR codes for verification
 */

import QRCode from 'qrcode';
import jsQR from 'jsqr';

export interface QRCodeData {
  type: 'verification' | 'certificate';
  hash?: string;
  txHash?: string;
  url?: string;
  timestamp?: number;
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCode(data: QRCodeData): Promise<string> {
  const verificationUrl = createVerificationUrl(data);

  try {
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1,
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrDataUrl;
  } catch (error) {
    console.error('QR Code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as canvas element
 */
export async function generateQRCodeCanvas(
  data: QRCodeData,
  size: number = 400
): Promise<HTMLCanvasElement> {
  const verificationUrl = createVerificationUrl(data);
  const canvas = document.createElement('canvas');

  try {
    await QRCode.toCanvas(canvas, verificationUrl, {
      errorCorrectionLevel: 'H',
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return canvas;
  } catch (error) {
    console.error('QR Code canvas generation failed:', error);
    throw new Error('Failed to generate QR code canvas');
  }
}

/**
 * Generate QR code as SVG string
 */
export async function generateQRCodeSVG(data: QRCodeData): Promise<string> {
  const verificationUrl = createVerificationUrl(data);

  try {
    const svgString = await QRCode.toString(verificationUrl, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return svgString;
  } catch (error) {
    console.error('QR Code SVG generation failed:', error);
    throw new Error('Failed to generate QR code SVG');
  }
}

/**
 * Create verification URL from QR data
 */
function createVerificationUrl(data: QRCodeData): string {
  const baseUrl = window.location.origin;

  if (data.url) {
    return data.url;
  }

  if (data.type === 'verification') {
    const hash = data.hash || data.txHash || '';
    return `${baseUrl}/verify?hash=${encodeURIComponent(hash)}`;
  }

  if (data.type === 'certificate') {
    const hash = data.hash || data.txHash || '';
    return `${baseUrl}/verify?hash=${encodeURIComponent(hash)}&cert=true`;
  }

  return `${baseUrl}/verify`;
}

/**
 * Scan QR code from image file
 */
export async function scanQRCodeFromFile(file: File): Promise<QRCodeData | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(null);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          const qrData = parseVerificationUrl(code.data);
          resolve(qrData);
        } else {
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      img.src = e.target?.result as string;
    };

    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Scan QR code from video stream (webcam)
 */
export function scanQRCodeFromVideo(
  videoElement: HTMLVideoElement,
  callback: (data: QRCodeData) => void,
  errorCallback?: () => void
): () => void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    errorCallback?.();
    return () => {};
  }

  let scanning = true;

  const scan = () => {
    if (!scanning) return;

    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        const qrData = parseVerificationUrl(code.data);
        if (qrData) {
          scanning = false;
          callback(qrData);
          return;
        }
      }
    }

    requestAnimationFrame(scan);
  };

  scan();

  // Return stop function
  return () => {
    scanning = false;
  };
}

/**
 * Parse verification URL into QR data
 */
function parseVerificationUrl(url: string): QRCodeData | null {
  try {
    const urlObj = new URL(url);
    const hash = urlObj.searchParams.get('hash');
    const isCert = urlObj.searchParams.get('cert') === 'true';

    if (!hash) return null;

    return {
      type: isCert ? 'certificate' : 'verification',
      hash: hash.startsWith('0x') ? undefined : hash,
      txHash: hash.startsWith('0x') ? hash : undefined,
      url,
      timestamp: Date.now(),
    };
  } catch (error) {
    // Not a valid URL, might be just a hash
    if (url.length === 64 || url.startsWith('0x')) {
      return {
        type: 'verification',
        hash: url.startsWith('0x') ? undefined : url,
        txHash: url.startsWith('0x') ? url : undefined,
        timestamp: Date.now(),
      };
    }

    return null;
  }
}

/**
 * Download QR code as image
 */
export async function downloadQRCode(
  data: QRCodeData,
  filename: string = 'origynl-verification-qr.png'
): Promise<void> {
  const qrDataUrl = await generateQRCode(data);

  const link = document.createElement('a');
  link.href = qrDataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copy verification URL to clipboard
 */
export async function copyVerificationUrl(data: QRCodeData): Promise<void> {
  const url = createVerificationUrl(data);

  try {
    await navigator.clipboard.writeText(url);
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Generate embeddable verification badge HTML
 */
export function generateVerificationBadge(
  data: QRCodeData,
  size: 'small' | 'medium' | 'large' = 'medium'
): string {
  const sizeMap = {
    small: { width: 150, padding: 10, fontSize: 12 },
    medium: { width: 200, padding: 12, fontSize: 14 },
    large: { width: 250, padding: 16, fontSize: 16 },
  };

  const config = sizeMap[size];
  const verificationUrl = createVerificationUrl(data);

  return `
    <div style="
      display: inline-block;
      background: #f9f9f9;
      border: 2px solid #e67e22;
      border-radius: 8px;
      padding: ${config.padding}px;
      text-align: center;
      font-family: Arial, sans-serif;
      width: ${config.width}px;
    ">
      <div style="
        background: #e67e22;
        color: white;
        padding: 8px;
        border-radius: 4px;
        font-weight: bold;
        font-size: ${config.fontSize}px;
        margin-bottom: 8px;
      ">
        ✓ VERIFIED
      </div>
      <div style="font-size: ${config.fontSize - 2}px; color: #666; margin-bottom: 8px;">
        Certified on blockchain
      </div>
      <a href="${verificationUrl}" target="_blank" style="
        display: inline-block;
        background: #e67e22;
        color: white;
        padding: 6px 12px;
        text-decoration: none;
        border-radius: 4px;
        font-size: ${config.fontSize - 2}px;
        font-weight: bold;
      ">
        Verify Now
      </a>
    </div>
  `.trim();
}
