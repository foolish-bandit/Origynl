import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { clientIp, rateLimit } from './_lib/rateLimit';

/**
 * PAdES-like signing for certificate PDFs.
 *
 * Body accepts a base64-encoded unsigned PDF; response returns a signed PDF
 * (also base64). The private key is held as a base64 PKCS#12 blob in
 * `SIGNING_P12_BASE64` with password `SIGNING_P12_PASS`. Self-signed by
 * default — document at the call site that it's *not* AATL-trusted.
 *
 * Graceful degradation: if the env isn't configured, returns 501 with a
 * stable error shape. The caller keeps using the unsigned PDF.
 */

const Body = z.object({
  pdfBase64: z.string().min(1),
  reason: z.string().max(200).optional(),
  name: z.string().max(120).optional(),
  contactInfo: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
});

const RATE_LIMIT_PER_MIN = Number(process.env.SIGN_CERT_RATE_LIMIT ?? '10');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const limit = await rateLimit('sign-certificate', clientIp(req), RATE_LIMIT_PER_MIN, 60);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfterSec));
    return res.status(429).json({ error: 'Too many requests', retryAfterSec: limit.retryAfterSec });
  }

  const p12Base64 = process.env.SIGNING_P12_BASE64;
  const p12Password = process.env.SIGNING_P12_PASS;
  if (!p12Base64 || !p12Password) {
    return res.status(501).json({
      error: 'PDF signing not configured',
      reason: 'SIGNING_P12_BASE64 / SIGNING_P12_PASS not set on this deployment',
      signed: false,
    });
  }

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  try {
    // Dynamic imports keep cold-start costs off unrelated endpoints and let
    // the endpoint compile even before `npm install` has pulled the
    // @signpdf packages into the deployment image.
    const [{ PDFDocument }, signpdfModule, pdfLibPlaceholderModule, p12SignerModule] =
      await Promise.all([
        import('pdf-lib'),
        import('@signpdf/signpdf'),
        import('@signpdf/placeholder-pdf-lib'),
        import('@signpdf/signer-p12'),
      ]);

    const signer = new p12SignerModule.P12Signer(Buffer.from(p12Base64, 'base64'), {
      passphrase: p12Password,
    });
    const pdfBytes = Buffer.from(parsed.data.pdfBase64, 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes);

    pdfLibPlaceholderModule.pdflibAddPlaceholder({
      pdfDoc,
      reason: parsed.data.reason ?? 'Origynl Authority — blockchain-anchored certificate',
      name: parsed.data.name ?? 'Origynl Authority',
      contactInfo: parsed.data.contactInfo ?? 'https://origynl.vercel.app',
      location: parsed.data.location ?? 'Polygon Amoy',
    });
    const withPlaceholder = Buffer.from(await pdfDoc.save());

    const signpdf = signpdfModule.default ?? signpdfModule;
    const signed: Buffer = await signpdf.sign(withPlaceholder, signer);

    return res.status(200).json({
      signed: true,
      pdfBase64: signed.toString('base64'),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'PDF signing failed';
    console.error('[sign-certificate] error:', message);
    return res.status(500).json({ error: message, signed: false });
  }
}
