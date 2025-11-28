
// @ts-ignore
import piexif from 'piexifjs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Adds a visible watermark to the bottom-right of an image.
 * Uses an HTML5 Canvas to draw the original image and overlay the hash.
 */
export const embedWatermark = async (
  file: File, 
  hash: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Watermark Configuration
      const fontSize = Math.max(12, Math.floor(img.width * 0.015)); // Responsive font size
      ctx.font = `bold ${fontSize}px Courier New, monospace`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      
      const text = `HASH: ${hash.substring(0, 16)}...`;
      const x = canvas.width - (fontSize);
      const y = canvas.height - (fontSize);

      // Draw Shadow/Stroke for readability on all backgrounds
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillText(text, x + 2, y + 2);

      // Draw Main Text (Orange as requested)
      ctx.fillStyle = '#f97316'; // Tailwind Orange-500
      ctx.fillText(text, x, y);

      // Export as PNG always (lossless = deterministic bytes for verification)
      const dataUrl = canvas.toDataURL('image/png');
      URL.revokeObjectURL(url);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

/**
 * Embeds the hash into file metadata.
 * - For JPEGs: Injects EXIF UserComment
 * - For PDFs: Injects PDF Metadata (Subject/Keywords) and visual text
 */
export const embedMetadata = async (
  file: File,
  visualDataUrl: string | null,
  hash: string
): Promise<string> => {
  
  // 1. Handle PDF
  if (file.type === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Embed Metadata
      pdfDoc.setTitle(`Authenticated: ${file.name}`);
      pdfDoc.setSubject(`ORIGINAL Protocol Hash: ${hash}`);
      pdfDoc.setKeywords([hash, 'ORIGINAL_PROTOCOL', 'BLOCKCHAIN_VERIFIED']);
      pdfDoc.setProducer('ORIGINAL Protocol V1.0');
      
      // Embed Visual Text on First Page (since we can't use Canvas for PDF)
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width } = firstPage.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.CourierBold);
      const fontSize = 10;
      const text = `HASH: ${hash.substring(0, 16)}...`;
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      
      firstPage.drawText(text, {
        x: width - textWidth - 20,
        y: 20,
        size: fontSize,
        font: font,
        color: rgb(0.97, 0.45, 0.09), // Orange-600 approx
      });

      const pdfBytes = await pdfDoc.save();
      return URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
    } catch (e) {
      console.error("PDF processing failed", e);
      return URL.createObjectURL(file);
    }
  }

  // 2. Handle JPEG (Inject EXIF)
  if ((file.type === 'image/jpeg' || file.type === 'image/jpg') && visualDataUrl) {
    try {
      const exifObj = {
        "0th": {
          [piexif.ImageIFD.Artist]: "ORIGINAL Protocol",
          [piexif.ImageIFD.ImageDescription]: `Authenticated via ORIGINAL. Hash: ${hash}`,
          [piexif.ImageIFD.Software]: "ORIGINAL Protocol V1.0"
        },
        "Exif": {
          [piexif.ExifIFD.UserComment]: `HASH=${hash}` 
        }
      };
      
      const exifStr = piexif.dump(exifObj);
      // Insert EXIF into the visualDataUrl (which is the watermarked image)
      const inserted = piexif.insert(exifStr, visualDataUrl);
      return inserted;
    } catch (e) {
      console.error("EXIF insertion failed", e);
      return visualDataUrl;
    }
  }

  // 3. Fallback for other types (PNG, etc) - return visual watermark if available, else original
  return visualDataUrl || URL.createObjectURL(file);
};

/**
 * Extracts the embedded hash from a file's metadata (if present).
 */
export const extractHashFromMetadata = async (file: File): Promise<string | null> => {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // 1. Handle JPEG
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      try {
        const exifObj = piexif.load(dataUrl);
        // Try UserComment first
        const userComment = exifObj["Exif"][piexif.ExifIFD.UserComment];
        if (userComment) {
          // UserComment is often prefixed like "HASH=..." or might be raw bytes
          const str = userComment.replace(/^HASH=/, '');
          // Clean up any non-hex chars if necessary
          const match = str.match(/[a-f0-9]{64}/i);
          if (match) return match[0];
        }
        
        // Try ImageDescription
        const desc = exifObj["0th"][piexif.ImageIFD.ImageDescription];
        if (desc) {
           const match = desc.match(/Hash: ([a-f0-9]{64})/i);
           if (match) return match[1];
        }
      } catch (e) {
        // No EXIF data
      }
    }

    // 2. Handle PDF
    if (file.type === 'application/pdf') {
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const keywords = pdfDoc.getKeywords();
      if (keywords) {
        // We stored hash as the first keyword or split by space
        const parts = keywords.split(' ');
        for (const part of parts) {
          // Clean punctuation
          const clean = part.replace(/[^a-f0-9]/gi, '');
          if (clean.length === 64) return clean;
        }
      }
      
      const subject = pdfDoc.getSubject();
      if (subject) {
         const match = subject.match(/Hash: ([a-f0-9]{64})/i);
         if (match) return match[1];
      }
    }

  } catch (e) {
    console.error("Failed to extract metadata", e);
  }
  return null;
};
