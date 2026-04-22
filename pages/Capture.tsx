import React, { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { SensorData } from '../types';
import { IconArrow, IconCamera, IconMonitor, IconRadio } from '../components/Icons';

type Mode = 'select' | 'camera' | 'screen';

function dataUrlToFile(dataUrl: string, name: string): File {
  const [meta, b64] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: mime });
}

async function captureScreen(): Promise<File | null> {
  const md = navigator.mediaDevices as MediaDevices & {
    getDisplayMedia?: (c?: MediaStreamConstraints) => Promise<MediaStream>;
  };
  if (!md?.getDisplayMedia) return null;
  const stream = await md.getDisplayMedia({ video: true });
  try {
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();
    await new Promise((r) => setTimeout(r, 120));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrlToFile(dataUrl, `screen-capture-${Date.now()}.png`);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

export const Capture: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('select');
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState<File | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [gyro, setGyro] = useState({ x: 0, y: 0 });
  const [gps, setGps] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  // Idle motion for HUD
  useEffect(() => {
    if (mode !== 'camera') return;
    const t = setInterval(() => {
      setGyro({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 });
    }, 120);
    return () => clearInterval(t);
  }, [mode]);

  // Ask for geolocation only on explicit intent (entering camera mode)
  useEffect(() => {
    if (mode !== 'camera' || gps) return;
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: Math.round(pos.coords.accuracy),
        });
      },
      () => {
        /* user denied — leave gps null */
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 8_000 },
    );
  }, [mode, gps]);

  const shoot = useCallback(() => {
    if (!webcamRef.current) return;
    setCapturing(true);
    const shot = webcamRef.current.getScreenshot();
    setTimeout(() => {
      setCapturing(false);
      if (shot) {
        const file = dataUrlToFile(shot, `witness-${Date.now()}.jpg`);
        setCaptured(file);
        setCapturedPreview(shot);
      }
    }, 300);
  }, []);

  const inscribe = () => {
    if (!captured) return;
    const sensors: SensorData = {
      gps: gps ?? undefined,
      timestamp: Date.now(),
    };
    navigate('/certify', {
      state: {
        file: captured,
        isLiveCapture: true,
        sensorData: sensors,
      },
    });
  };

  const reshoot = () => {
    setCaptured(null);
    setCapturedPreview(null);
  };

  const handleScreenMode = async () => {
    setMode('screen');
    try {
      const file = await captureScreen();
      if (file) {
        setCaptured(file);
        setCapturedPreview(URL.createObjectURL(file));
      } else {
        setPermissionError(
          'Screen capture is not supported in this browser. Try Chrome or Edge on desktop.',
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Screen capture failed';
      setPermissionError(msg);
    }
  };

  /* -------- SELECT SCREEN -------- */
  if (mode === 'select') {
    return (
      <div style={{ padding: '64px 48px', maxWidth: 960, margin: '0 auto' }}>
        <div className="label" style={{ color: 'var(--seal)' }}>§ CAPTURE · LIVE WITNESS</div>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(56px, 7vw, 112px)',
            letterSpacing: '-0.035em',
            lineHeight: 1.02,
            marginTop: 12,
          }}
        >
          Witness<br />this moment.
        </h1>
        <p style={{ marginTop: 32, color: 'var(--ink-dim)', fontSize: 17, maxWidth: 620 }}>
          Capture a photo or a screen with Origynl acting as the witness. Sensor telemetry — GPS and timestamp — is cryptographically bound to the image before inscription.
        </p>
        <div
          style={{
            marginTop: 48,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
        >
          {[
            {
              id: 'camera' as const,
              Icon: IconCamera,
              title: 'Camera',
              desc: 'Photograph a document, scene, or object. Includes GPS telemetry.',
              tag: 'MOBILE + DESKTOP',
              onClick: () => setMode('camera'),
            },
            {
              id: 'screen' as const,
              Icon: IconMonitor,
              title: 'Screen',
              desc: 'Grab the current screen — a webpage, chat, email. Prove what you saw, when.',
              tag: 'DESKTOP ONLY',
              onClick: handleScreenMode,
            },
          ].map((o) => (
            <button
              key={o.id}
              onClick={o.onClick}
              style={{
                textAlign: 'left',
                padding: 32,
                background: 'var(--bg-1)',
                border: '1px solid var(--rule)',
                cursor: 'pointer',
                transition: 'all .2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ink)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--rule)')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    border: '1px solid var(--rule)',
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--seal)',
                  }}
                >
                  <o.Icon size={20} />
                </div>
                <span className="label-sm">{o.tag}</span>
              </div>
              <h3
                className="serif"
                style={{ fontSize: 36, letterSpacing: '-0.02em', marginTop: 24 }}
              >
                {o.title}
              </h3>
              <p style={{ marginTop: 12, color: 'var(--ink-dim)', fontSize: 13 }}>{o.desc}</p>
              <div
                style={{
                  marginTop: 20,
                  display: 'inline-flex',
                  gap: 8,
                  color: 'var(--seal)',
                  alignItems: 'center',
                  fontSize: 12,
                }}
              >
                Begin <IconArrow size={12} />
              </div>
            </button>
          ))}
        </div>
        <div
          style={{
            marginTop: 32,
            padding: 16,
            background: 'var(--bg-1)',
            border: '1px solid var(--rule)',
            fontSize: 12,
            color: 'var(--ink-dim)',
          }}
        >
          <span className="label" style={{ color: 'var(--seal)', marginRight: 8 }}>PRIVACY</span>
          All captures are processed locally. Nothing is uploaded until you confirm certification on the next step.
        </div>
      </div>
    );
  }

  /* -------- CAMERA MODE -------- */
  if (mode === 'camera') {
    return (
      <div
        style={{
          background: '#000',
          minHeight: 'calc(100vh - 72px - 28px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 24px',
            borderBottom: '1px solid rgba(255,255,255,.08)',
          }}
        >
          <button
            onClick={() => {
              setMode('select');
              reshoot();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            ← Back
          </button>
          <div
            style={{
              display: 'flex',
              gap: 20,
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: '#888',
              letterSpacing: '0.15em',
              flexWrap: 'wrap',
            }}
          >
            <span>
              <span
                className="pulsedot"
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  background: '#f60',
                  borderRadius: '50%',
                  marginRight: 6,
                }}
              />
              WITNESS MODE ACTIVE
            </span>
            <span>
              GPS:{' '}
              {gps
                ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)} · ±${gps.acc}M`
                : 'UNAVAILABLE'}
            </span>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: 'grid',
            placeItems: 'center',
            padding: 32,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 'min(90%, 920px)',
              aspectRatio: '16/10',
              background: '#0a0a0a',
              border: '1px solid rgba(255,255,255,.1)',
              overflow: 'hidden',
            }}
          >
            {!capturedPreview && (
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'environment' }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onUserMediaError={(err) => {
                  const msg = err instanceof Error ? err.message : 'Camera permission denied';
                  setPermissionError(msg);
                }}
              />
            )}

            {capturedPreview && (
              <img
                src={capturedPreview}
                alt="captured"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}

            {/* Grid overlay */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '33.33%', width: 1, background: 'rgba(255,255,255,.06)' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '66.66%', width: 1, background: 'rgba(255,255,255,.06)' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '33.33%', height: 1, background: 'rgba(255,255,255,.06)' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '66.66%', height: 1, background: 'rgba(255,255,255,.06)' }} />
            </div>

            {/* Corner brackets */}
            {(['tl', 'tr', 'bl', 'br'] as const).map((id) => {
              const s: React.CSSProperties = {
                position: 'absolute',
                width: 20,
                height: 20,
                border: '1px solid rgba(255,255,255,.3)',
              };
              if (id[0] === 't') {
                s.top = 16;
                s.borderBottom = 'none';
              } else {
                s.bottom = 16;
                s.borderTop = 'none';
              }
              if (id[1] === 'l') {
                s.left = 16;
                s.borderRight = 'none';
              } else {
                s.right = 16;
                s.borderLeft = 'none';
              }
              return <div key={id} style={s} />;
            })}

            {/* Center reticle */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) rotate(${gyro.x * 3}deg)`,
                width: 64,
                height: 64,
                border: '1px solid rgba(255,102,0,.6)',
                display: 'grid',
                placeItems: 'center',
                transition: 'transform .1s',
              }}
            >
              <div style={{ width: 6, height: 6, background: '#f60' }} />
              <div style={{ position: 'absolute', width: 80, height: 1, background: 'rgba(255,102,0,.3)' }} />
              <div style={{ position: 'absolute', width: 1, height: 80, background: 'rgba(255,102,0,.3)' }} />
            </div>

            {/* Bottom HUD */}
            <div
              style={{
                position: 'absolute',
                left: 16,
                bottom: 16,
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: 'rgba(255,255,255,.6)',
                background: 'rgba(0,0,0,.5)',
                padding: '6px 10px',
                letterSpacing: '0.1em',
              }}
            >
              <div>ACCEL_Z: {(9.8 + gyro.y * 0.1).toFixed(3)} G</div>
              <div>EXPOSURE: 1/120 · ISO 400</div>
              <div>FINGERPRINT: PENDING</div>
            </div>

            {/* Flash */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#fff',
                opacity: capturing ? 1 : 0,
                transition: 'opacity .1s',
                pointerEvents: 'none',
              }}
            />
          </div>

          {permissionError && (
            <div
              style={{
                position: 'absolute',
                bottom: 96,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,.8)',
                border: '1px solid var(--bad)',
                color: 'var(--bad)',
                padding: '10px 14px',
                fontSize: 12,
                fontFamily: 'var(--mono)',
              }}
            >
              {permissionError}
            </div>
          )}
        </div>

        {/* Shutter / inscribe bar */}
        <div
          style={{
            padding: '24px',
            borderTop: '1px solid rgba(255,255,255,.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 48,
          }}
        >
          {capturedPreview ? (
            <>
              <button
                onClick={reshoot}
                className="btn"
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}
              >
                Retake
              </button>
              <button onClick={inscribe} className="btn btn-seal">
                Inscribe & certify <IconArrow size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#222',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
                aria-label="Mute indicator"
              >
                <IconRadio size={18} />
              </button>
              <button
                onClick={shoot}
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,.3)',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  padding: 0,
                }}
                aria-label="Capture photo"
              >
                <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#fff' }} />
              </button>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: '#666',
                  letterSpacing: '0.15em',
                }}
              >
                LIVE PROOF
                <br />
                PROTOCOL
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* -------- SCREEN MODE -------- */
  return (
    <div
      style={{
        background: '#000',
        minHeight: 'calc(100vh - 72px - 28px)',
        padding: 48,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <button
          onClick={() => {
            setMode('select');
            reshoot();
            setPermissionError(null);
          }}
          style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 12 }}
        >
          ← Back
        </button>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.2em',
            color: '#fff',
          }}
        >
          <span
            className="pulsedot"
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              background: '#f60',
              borderRadius: '50%',
              marginRight: 8,
              verticalAlign: 'middle',
            }}
          />
          SCREEN CAPTURE
        </div>
      </div>
      <div
        style={{
          border: '1px solid rgba(255,255,255,.1)',
          aspectRatio: '16/10',
          background: '#111',
          display: 'grid',
          placeItems: 'center',
          color: 'rgba(255,255,255,.3)',
          fontFamily: 'var(--mono)',
          fontSize: 12,
          letterSpacing: '0.15em',
          overflow: 'hidden',
        }}
      >
        {capturedPreview ? (
          <img
            src={capturedPreview}
            alt="screen capture"
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          />
        ) : (
          <span>{permissionError ? permissionError : '[ AWAITING SCREEN FEED ]'}</span>
        )}
      </div>
      <div style={{ marginTop: 32, textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center' }}>
        {capturedPreview ? (
          <>
            <button
              className="btn"
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}
              onClick={() => {
                reshoot();
                void handleScreenMode();
              }}
            >
              Retake
            </button>
            <button onClick={inscribe} className="btn btn-seal" style={{ padding: '18px 40px' }}>
              Inscribe & certify <IconArrow size={14} />
            </button>
          </>
        ) : (
          <button
            onClick={handleScreenMode}
            className="btn btn-seal"
            style={{ padding: '18px 40px' }}
          >
            Capture screen <IconArrow size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
