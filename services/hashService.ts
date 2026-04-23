import { SensorData } from '../types';

/**
 * Computes the SHA-256 hash of a File or Blob. Returns lowercase 64-char hex.
 */
export const computeFileHash = async (file: File | Blob): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Binds image bytes to captured sensor data so the resulting hash only matches
 * for this exact capture context. The sensor object is canonicalised (sorted
 * keys, rounded GPS) so two independent verifiers arriving at the same bytes +
 * sensors land on the same hash. The caller's `sensors.timestamp` is used as-is
 * — do not mix in `Date.now()` because that would desync any retry.
 */
export const computeCompositeHash = async (file: Blob, sensors: SensorData): Promise<string> => {
  const fileBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(fileBuffer);

  const canonical = {
    gps: sensors.gps
      ? {
          // ~11 cm precision. Higher precision surfaces sensor jitter and
          // defeats the purpose — two legitimate reads of the same spot drift.
          lat: Math.round(sensors.gps.lat * 1_000_000) / 1_000_000,
          lng: Math.round(sensors.gps.lng * 1_000_000) / 1_000_000,
          accuracy:
            typeof sensors.gps.accuracy === 'number'
              ? Math.round(sensors.gps.accuracy)
              : undefined,
        }
      : null,
    motion: sensors.motion
      ? {
          x: Math.round(sensors.motion.x * 100) / 100,
          y: Math.round(sensors.motion.y * 100) / 100,
          z: Math.round(sensors.motion.z * 100) / 100,
        }
      : null,
    t: sensors.timestamp,
  };

  const sensorBytes = new TextEncoder().encode(JSON.stringify(canonical));
  const combined = new Uint8Array(fileBytes.length + sensorBytes.length);
  combined.set(fileBytes);
  combined.set(sensorBytes, fileBytes.length);

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};
