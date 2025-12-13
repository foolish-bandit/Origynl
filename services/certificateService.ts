import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { MerkleProof } from './merkleService';
import { AuthenticityScore } from './authenticityService';

export interface CertificateData {
  fileName: string;
  fileHash: string;
  txHash: string;
  timestamp: number;
  blockHeight?: number;
  sender?: string;
  authenticityScore?: AuthenticityScore;
}

export interface BatchCertificateData {
  fileName: string;
  fileHash: string;
  txHash: string;
  timestamp: number;
  merkleProof: MerkleProof;
}

export const generateCertificate = async (data: CertificateData): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  
  const { width, height } = page.getSize();
  
  // Colors
  const black = rgb(0.05, 0.05, 0.05);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.7, 0.7, 0.7);
  const orange = rgb(0.92, 0.34, 0.05);
  
  // Border
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: lightGray,
    borderWidth: 1,
  });
  
  // Inner border
  page.drawRectangle({
    x: 40,
    y: 40,
    width: width - 80,
    height: height - 80,
    borderColor: lightGray,
    borderWidth: 0.5,
  });

  // Header
  page.drawText('ORIGYNL', {
    x: 60,
    y: height - 80,
    size: 28,
    font: helveticaBold,
    color: black,
  });
  
  page.drawText('.', {
    x: 60 + helveticaBold.widthOfTextAtSize('ORIGYNL', 28),
    y: height - 80,
    size: 28,
    font: helveticaBold,
    color: orange,
  });

  // Title
  page.drawText('CERTIFICATE OF AUTHENTICITY', {
    x: 60,
    y: height - 130,
    size: 16,
    font: helveticaBold,
    color: black,
  });
  
  // Subtitle
  page.drawText('Blockchain-Verified Document Certification', {
    x: 60,
    y: height - 150,
    size: 10,
    font: helvetica,
    color: gray,
  });

  // Divider line
  page.drawLine({
    start: { x: 60, y: height - 170 },
    end: { x: width - 60, y: height - 170 },
    thickness: 1,
    color: lightGray,
  });

  // Certificate text
  const certDate = new Date(data.timestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const certTime = new Date(data.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  page.drawText('This certificate confirms that the following document:', {
    x: 60,
    y: height - 210,
    size: 11,
    font: helvetica,
    color: black,
  });

  // File name box
  page.drawRectangle({
    x: 60,
    y: height - 270,
    width: width - 120,
    height: 40,
    color: rgb(0.97, 0.97, 0.97),
    borderColor: lightGray,
    borderWidth: 0.5,
  });
  
  // Truncate filename if too long
  let displayName = data.fileName;
  const maxWidth = width - 140;
  while (helveticaBold.widthOfTextAtSize(displayName, 12) > maxWidth && displayName.length > 10) {
    displayName = displayName.slice(0, -4) + '...';
  }
  
  page.drawText(displayName, {
    x: 70,
    y: height - 255,
    size: 12,
    font: helveticaBold,
    color: black,
  });

  // Main certificate text
  page.drawText('was certified to exist on:', {
    x: 60,
    y: height - 300,
    size: 11,
    font: helvetica,
    color: black,
  });

  page.drawText(certDate, {
    x: 60,
    y: height - 330,
    size: 18,
    font: helveticaBold,
    color: black,
  });
  
  page.drawText(`at ${certTime}`, {
    x: 60,
    y: height - 350,
    size: 11,
    font: helvetica,
    color: gray,
  });

  // Details section
  page.drawLine({
    start: { x: 60, y: height - 380 },
    end: { x: width - 60, y: height - 380 },
    thickness: 0.5,
    color: lightGray,
  });

  page.drawText('VERIFICATION DETAILS', {
    x: 60,
    y: height - 410,
    size: 10,
    font: helveticaBold,
    color: orange,
  });

  // Document fingerprint
  page.drawText('Document Fingerprint (SHA-256):', {
    x: 60,
    y: height - 440,
    size: 9,
    font: helveticaBold,
    color: gray,
  });
  
  page.drawText(data.fileHash, {
    x: 60,
    y: height - 455,
    size: 7,
    font: courier,
    color: black,
  });

  // Transaction ID
  page.drawText('Blockchain Transaction ID:', {
    x: 60,
    y: height - 485,
    size: 9,
    font: helveticaBold,
    color: gray,
  });
  
  page.drawText(data.txHash, {
    x: 60,
    y: height - 500,
    size: 7,
    font: courier,
    color: black,
  });

  // Network info
  page.drawText('Network:', {
    x: 60,
    y: height - 530,
    size: 9,
    font: helveticaBold,
    color: gray,
  });
  
  page.drawText('Polygon Amoy (Testnet)', {
    x: 120,
    y: height - 530,
    size: 9,
    font: helvetica,
    color: black,
  });

  // Verification URL section
  page.drawLine({
    start: { x: 60, y: height - 560 },
    end: { x: width - 60, y: height - 560 },
    thickness: 0.5,
    color: lightGray,
  });

  page.drawText('HOW TO VERIFY', {
    x: 60,
    y: height - 590,
    size: 10,
    font: helveticaBold,
    color: orange,
  });

  page.drawText('1. Visit the blockchain explorer to view this transaction:', {
    x: 60,
    y: height - 615,
    size: 9,
    font: helvetica,
    color: black,
  });
  
  const explorerUrl = `https://polygonscan.com/tx/${data.txHash}`;
  page.drawText(explorerUrl, {
    x: 60,
    y: height - 630,
    size: 7,
    font: courier,
    color: orange,
  });

  page.drawText('2. Or verify the document at:', {
    x: 60,
    y: height - 655,
    size: 9,
    font: helvetica,
    color: black,
  });
  
  page.drawText('https://origynl-20.vercel.app/verify', {
    x: 60,
    y: height - 670,
    size: 7,
    font: courier,
    color: orange,
  });

  // Add AI Detection results if available
  if (data.authenticityScore) {
    page.drawLine({
      start: { x: 60, y: height - 700 },
      end: { x: width - 60, y: height - 700 },
      thickness: 0.5,
      color: lightGray,
    });

    page.drawText('AI DETECTION & AUTHENTICITY ANALYSIS', {
      x: 60,
      y: height - 730,
      size: 10,
      font: helveticaBold,
      color: orange,
    });

    const scoreColor = data.authenticityScore.overall >= 70 ? rgb(0.133, 0.725, 0.506) :
                       data.authenticityScore.overall >= 50 ? rgb(0.918, 0.702, 0.031) :
                       rgb(0.937, 0.267, 0.267);

    page.drawText(`Authenticity Score: ${data.authenticityScore.overall}/100`, {
      x: 60,
      y: height - 755,
      size: 11,
      font: helveticaBold,
      color: scoreColor,
    });

    page.drawText(`Status: ${data.authenticityScore.level}`, {
      x: 60,
      y: height - 772,
      size: 9,
      font: helvetica,
      color: black,
    });

    // Risk factors
    if (data.authenticityScore.riskFactors.length > 0) {
      page.drawText('Risk Factors:', {
        x: 60,
        y: height - 795,
        size: 8,
        font: helveticaBold,
        color: rgb(0.8, 0.3, 0),
      });

      let riskY = height - 810;
      data.authenticityScore.riskFactors.slice(0, 3).forEach((risk, idx) => {
        const truncatedRisk = risk.length > 70 ? risk.slice(0, 67) + '...' : risk;
        page.drawText(`• ${truncatedRisk}`, {
          x: 65,
          y: riskY,
          size: 7,
          font: helvetica,
          color: gray,
        });
        riskY -= 12;
      });
    } else {
      page.drawText('✓ No AI generation indicators detected', {
        x: 60,
        y: height - 795,
        size: 8,
        font: helvetica,
        color: rgb(0.133, 0.725, 0.506),
      });

      page.drawText('✓ All authenticity checks passed', {
        x: 60,
        y: height - 810,
        size: 8,
        font: helvetica,
        color: rgb(0.133, 0.725, 0.506),
      });
    }
  }

  // Footer
  page.drawLine({
    start: { x: 60, y: 100 },
    end: { x: width - 60, y: 100 },
    thickness: 0.5,
    color: lightGray,
  });

  page.drawText('This certificate was generated by Origynl - Blockchain Document Certification', {
    x: 60,
    y: 80,
    size: 8,
    font: helvetica,
    color: lightGray,
  });

  page.drawText('The cryptographic fingerprint above uniquely identifies this document. Any modification to the', {
    x: 60,
    y: 65,
    size: 7,
    font: helvetica,
    color: lightGray,
  });

  page.drawText('original file will result in a different fingerprint, making tampering detectable.', {
    x: 60,
    y: 55,
    size: 7,
    font: helvetica,
    color: lightGray,
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Generate a certificate for a file that was part of a batch certification
 */
export const generateBatchCertificate = async (data: BatchCertificateData): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  
  const { width, height } = page.getSize();
  
  const black = rgb(0.05, 0.05, 0.05);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.7, 0.7, 0.7);
  const orange = rgb(0.92, 0.34, 0.05);
  
  // Border
  page.drawRectangle({
    x: 30, y: 30, width: width - 60, height: height - 60,
    borderColor: lightGray, borderWidth: 1,
  });
  
  page.drawRectangle({
    x: 40, y: 40, width: width - 80, height: height - 80,
    borderColor: lightGray, borderWidth: 0.5,
  });

  // Header
  page.drawText('ORIGYNL', {
    x: 60, y: height - 80, size: 28, font: helveticaBold, color: black,
  });
  page.drawText('.', {
    x: 60 + helveticaBold.widthOfTextAtSize('ORIGYNL', 28),
    y: height - 80, size: 28, font: helveticaBold, color: orange,
  });

  // Title with batch indicator
  page.drawText('CERTIFICATE OF AUTHENTICITY', {
    x: 60, y: height - 130, size: 16, font: helveticaBold, color: black,
  });
  
  page.drawText(`Batch Certification (${data.merkleProof.index + 1} of ${data.merkleProof.totalFiles} documents)`, {
    x: 60, y: height - 150, size: 10, font: helvetica, color: gray,
  });

  page.drawLine({
    start: { x: 60, y: height - 170 }, end: { x: width - 60, y: height - 170 },
    thickness: 1, color: lightGray,
  });

  // Certificate text
  const certDate = new Date(data.timestamp).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const certTime = new Date(data.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
  });

  page.drawText('This certificate confirms that the following document:', {
    x: 60, y: height - 210, size: 11, font: helvetica, color: black,
  });

  // File name box
  page.drawRectangle({
    x: 60, y: height - 265, width: width - 120, height: 35,
    color: rgb(0.97, 0.97, 0.97), borderColor: lightGray, borderWidth: 0.5,
  });
  
  let displayName = data.fileName;
  const maxWidth = width - 140;
  while (helveticaBold.widthOfTextAtSize(displayName, 11) > maxWidth && displayName.length > 10) {
    displayName = displayName.slice(0, -4) + '...';
  }
  page.drawText(displayName, {
    x: 70, y: height - 252, size: 11, font: helveticaBold, color: black,
  });

  page.drawText('was certified to exist on:', {
    x: 60, y: height - 290, size: 11, font: helvetica, color: black,
  });

  page.drawText(certDate, {
    x: 60, y: height - 315, size: 16, font: helveticaBold, color: black,
  });
  page.drawText(`at ${certTime}`, {
    x: 60, y: height - 332, size: 10, font: helvetica, color: gray,
  });

  // How batch certification works
  page.drawLine({
    start: { x: 60, y: height - 355 }, end: { x: width - 60, y: height - 355 },
    thickness: 0.5, color: lightGray,
  });

  page.drawText('HOW THIS WORKS', {
    x: 60, y: height - 380, size: 10, font: helveticaBold, color: orange,
  });

  const explanationLines = [
    `This document was certified alongside ${data.merkleProof.totalFiles - 1} other files in a single batch.`,
    'Instead of recording each file separately, we combined all the fingerprints into one',
    '"summary fingerprint" (called a root hash) and recorded that on the blockchain.',
    '',
    'This certificate contains a mathematical proof that lets anyone verify this specific',
    'document was part of that batch—without needing access to the other files.',
  ];
  
  let yPos = height - 400;
  for (const line of explanationLines) {
    page.drawText(line, {
      x: 60, y: yPos, size: 8, font: helvetica, color: gray,
    });
    yPos -= 12;
  }

  // Technical details
  page.drawLine({
    start: { x: 60, y: height - 480 }, end: { x: width - 60, y: height - 480 },
    thickness: 0.5, color: lightGray,
  });

  page.drawText('VERIFICATION DETAILS', {
    x: 60, y: height - 505, size: 10, font: helveticaBold, color: orange,
  });

  // Document fingerprint
  page.drawText('This Document\'s Fingerprint:', {
    x: 60, y: height - 530, size: 8, font: helveticaBold, color: gray,
  });
  page.drawText(data.fileHash, {
    x: 60, y: height - 543, size: 6, font: courier, color: black,
  });

  // Root hash
  page.drawText('Batch Summary (Root Hash on Blockchain):', {
    x: 60, y: height - 565, size: 8, font: helveticaBold, color: gray,
  });
  page.drawText(data.merkleProof.rootHash, {
    x: 60, y: height - 578, size: 6, font: courier, color: black,
  });

  // Transaction
  page.drawText('Blockchain Transaction:', {
    x: 60, y: height - 600, size: 8, font: helveticaBold, color: gray,
  });
  page.drawText(data.txHash, {
    x: 60, y: height - 613, size: 6, font: courier, color: black,
  });

  // Proof path (simplified)
  page.drawText(`Proof Path (${data.merkleProof.proofPath.length} steps):`, {
    x: 60, y: height - 635, size: 8, font: helveticaBold, color: gray,
  });
  
  const proofSummary = data.merkleProof.proofPath.length > 0 
    ? data.merkleProof.proofPath.map((p, i) => `${i + 1}:${p.hash.slice(0, 8)}...`).join(' → ')
    : 'Single file batch (no proof needed)';
  page.drawText(proofSummary, {
    x: 60, y: height - 648, size: 6, font: courier, color: gray,
  });

  // Verification links
  page.drawLine({
    start: { x: 60, y: height - 670 }, end: { x: width - 60, y: height - 670 },
    thickness: 0.5, color: lightGray,
  });

  page.drawText('VERIFY THIS CERTIFICATE', {
    x: 60, y: height - 693, size: 10, font: helveticaBold, color: orange,
  });

  page.drawText('View transaction: ', {
    x: 60, y: height - 715, size: 8, font: helvetica, color: black,
  });
  page.drawText(`https://polygonscan.com/tx/${data.txHash}`, {
    x: 140, y: height - 715, size: 6, font: courier, color: orange,
  });

  // Footer
  page.drawLine({
    start: { x: 60, y: 70 }, end: { x: width - 60, y: 70 },
    thickness: 0.5, color: lightGray,
  });

  page.drawText('This certificate was generated by Origynl. The proof path above can be used to mathematically', {
    x: 60, y: 55, size: 7, font: helvetica, color: lightGray,
  });
  page.drawText('verify this document was part of the certified batch without revealing the other documents.', {
    x: 60, y: 45, size: 7, font: helvetica, color: lightGray,
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};
