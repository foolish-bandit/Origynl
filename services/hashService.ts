
import { SensorData } from '../types';

/**
 * Computes the SHA-256 hash of a File or Blob.
 * Uses the native Web Crypto API for performance and security.
 */
export const computeFileHash = async (file: File | Blob): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Computes a "Live Hash" which binds the image bytes to the sensor data.
 * This proves the image was taken while these specific forces/location were present.
 */
export const computeCompositeHash = async (file: Blob, sensors: SensorData): Promise<string> => {
  const fileBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(fileBuffer);
  
  // Create a deterministic string from sensor data
  // We floor values to avoid floating point drift between verifiers
  const sensorString = JSON.stringify({
    lat: sensors.gps ? Math.floor(sensors.gps.lat * 10000) : 'null',
    lng: sensors.gps ? Math.floor(sensors.gps.lng * 10000) : 'null',
    mx: sensors.motion ? Math.floor(sensors.motion.x * 100) : 'null',
    t: sensors.timestamp
  });

  const sensorEncoder = new TextEncoder();
  const sensorBytes = sensorEncoder.encode(sensorString);

  // Combine Arrays
  const combinedBuffer = new Uint8Array(fileBytes.length + sensorBytes.length);
  combinedBuffer.set(fileBytes);
  combinedBuffer.set(sensorBytes, fileBytes.length);

  // Hash the Combination
  const hashBuffer = await crypto.subtle.digest('SHA-256', combinedBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};
