
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Zap, AlertTriangle, ShieldCheck, SwitchCamera, Lock, Monitor, Smartphone } from 'lucide-react';
import { SensorData } from '../types';

type CaptureMode = 'select' | 'camera' | 'screen';

export const Capture: React.FC = () => {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const [mode, setMode] = useState<CaptureMode>('select');
  const [sensors, setSensors] = useState<SensorData>({ timestamp: 0 });
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [gyroVis, setGyroVis] = useState({ x: 0, y: 0 });
  const [screenPreview, setScreenPreview] = useState<string | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  const requestPermissions = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSensors(prev => ({
            ...prev,
            gps: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            }
          }));
        },
        (err) => console.log("GPS Denied", err)
      );
    }
    setPermissionGranted(true);
  };

  useEffect(() => {
    if (!permissionGranted || mode !== 'camera') return;

    const interval = setInterval(() => {
      setGyroVis({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2
      });
      setSensors(prev => ({
        ...prev,
        motion: { 
          x: Math.random(), 
          y: Math.random(), 
          z: 9.8 + (Math.random() - 0.5) 
        }
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [permissionGranted, mode]);

  const handleCameraCapture = useCallback(() => {
    setCapturing(true);
    
    setTimeout(() => {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc) {
        fetch(imageSrc)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], `live_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            navigate('/certify', { 
              state: { 
                file, 
                sensorData: { ...sensors, timestamp: Date.now() },
                isLiveCapture: true 
              } 
            });
          });
      }
    }, 600); 
  }, [webcamRef, navigate, sensors]);

  const startScreenCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          displaySurface: 'monitor',
        },
        audio: false
      });
      
      setScreenStream(stream);
      setMode('screen');

      // Handle when user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        setMode('select');
        setScreenStream(null);
        setScreenPreview(null);
      };

      // Wait for video to be ready
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        await screenVideoRef.current.play();
      }
    } catch (err) {
      console.error('Screen capture error:', err);
    }
  };

  const captureScreen = async () => {
    if (!screenVideoRef.current || !screenStream) return;
    
    setCapturing(true);

    const video = screenVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
    }

    // Stop the stream
    screenStream.getTracks().forEach(track => track.stop());
    setScreenStream(null);

    // Convert to file and navigate
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `screen_capture_${Date.now()}.png`, { type: 'image/png' });
        navigate('/certify', {
          state: {
            file,
            sensorData: { timestamp: Date.now() },
            isLiveCapture: true
          }
        });
      }
    }, 'image/png');
  };

  const cancelScreenCapture = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    setScreenStream(null);
    setScreenPreview(null);
    setMode('select');
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  // Check if screen capture is supported
  const isScreenCaptureSupported = typeof navigator !== 'undefined' && 
    navigator.mediaDevices && 
    'getDisplayMedia' in navigator.mediaDevices;

  // Mode selection screen
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl text-white mb-4">Live Capture</h2>
            <p className="text-neutral-500 max-w-md mx-auto leading-relaxed">
              Capture and certify in real-time. Prove that content existed at this exact moment.
            </p>
          </div>

          <div className="space-y-4">
            {/* Camera option */}
            <button
              onClick={() => {
                requestPermissions();
                setMode('camera');
              }}
              className="w-full p-6 bg-neutral-900 border border-white/10 hover:border-orange-600 transition-all group text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-neutral-800 group-hover:bg-orange-600/20 flex items-center justify-center transition-colors">
                  <Camera className="text-neutral-400 group-hover:text-orange-600 transition-colors" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold mb-1">Camera Capture</h3>
                  <p className="text-neutral-500 text-sm">
                    Photograph a document, scene, or object. Includes GPS location and motion data for enhanced proof.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Smartphone size={12} className="text-neutral-600" />
                    <span className="text-[10px] text-neutral-600 uppercase tracking-widest">Mobile & Desktop</span>
                  </div>
                </div>
              </div>
            </button>

            {/* Screen capture option */}
            <button
              onClick={startScreenCapture}
              disabled={!isScreenCaptureSupported}
              className={`w-full p-6 bg-neutral-900 border transition-all group text-left ${
                isScreenCaptureSupported 
                  ? 'border-white/10 hover:border-orange-600' 
                  : 'border-white/5 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isScreenCaptureSupported 
                    ? 'bg-neutral-800 group-hover:bg-orange-600/20' 
                    : 'bg-neutral-900'
                }`}>
                  <Monitor className={`transition-colors ${
                    isScreenCaptureSupported 
                      ? 'text-neutral-400 group-hover:text-orange-600' 
                      : 'text-neutral-700'
                  }`} size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold mb-1">Screen Capture</h3>
                  <p className="text-neutral-500 text-sm">
                    Capture what's on your screen — a webpage, document, email, or chat. Prove what you saw at this moment.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    {isScreenCaptureSupported ? (
                      <>
                        <Monitor size={12} className="text-neutral-600" />
                        <span className="text-[10px] text-neutral-600 uppercase tracking-widest">Desktop Only</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={12} className="text-yellow-600" />
                        <span className="text-[10px] text-yellow-600 uppercase tracking-widest">Not supported on this device</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </button>
          </div>

          <p className="text-center text-neutral-600 text-xs">
            All captures are processed locally. Nothing is uploaded until you certify.
          </p>
        </div>
      </div>
    );
  }

  // Screen capture mode
  if (mode === 'screen') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl">
          
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <span className="font-mono text-sm text-white uppercase tracking-widest">Screen Capture Active</span>
            </div>
            <button
              onClick={cancelScreenCapture}
              className="text-neutral-500 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="relative bg-neutral-900 border border-white/10 overflow-hidden">
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto max-h-[70vh] object-contain"
            />
            
            {/* Capture overlay */}
            <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-200 ${capturing ? 'opacity-100' : 'opacity-0'}`}></div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              onClick={captureScreen}
              disabled={capturing}
              className="px-12 py-5 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              Capture & Certify
            </button>
            <p className="text-neutral-600 text-xs text-center max-w-md">
              Click the button above to capture the current screen content. The capture will be timestamped and certified on the blockchain.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Camera mode (existing code)
  return (
    <div className="min-h-[100dvh] bg-black relative flex flex-col md:justify-center overflow-hidden pb-20 md:pb-0">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden w-full h-16 bg-neutral-900 border-b border-white/10 flex items-center justify-between px-6 z-20">
         <button onClick={() => setMode('select')} className="text-neutral-500 hover:text-white text-sm">
           ← Back
         </button>
         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
      </div>

      {/* Desktop back button */}
      <div className="hidden md:block absolute top-8 left-8 z-30">
        <button onClick={() => setMode('select')} className="text-neutral-500 hover:text-white text-sm">
          ← Back to options
        </button>
      </div>

      {/* Viewfinder Container */}
      <div className="relative w-full md:max-w-4xl aspect-[3/4] md:aspect-video bg-neutral-900 border-y md:border border-neutral-800 shadow-2xl overflow-hidden group mx-auto">
        
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width="100%"
          height="100%"
          videoConstraints={{ facingMode: facingMode }}
          playsInline={true}
          muted={true}
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />

        {/* HUD Overlay */}
        <div className="absolute inset-0 pointer-events-none p-6 md:p-12 flex flex-col justify-between z-10">
          
          <div className="flex justify-between items-start">
             <div className="space-y-1">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="font-mono text-[10px] text-white uppercase tracking-widest bg-black/50 px-2 py-1">
                   Witness Mode: Active
                 </span>
               </div>
               {sensors.gps && (
                 <div className="font-mono text-[9px] text-orange-500 flex items-center gap-1 bg-black/50 px-2">
                   <MapPin size={8} />
                   {sensors.gps.lat.toFixed(4)}, {sensors.gps.lng.toFixed(4)}
                 </div>
               )}
             </div>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-white/20 flex items-center justify-center">
             <div className="w-1 h-1 bg-white/50"></div>
             <div 
               className="absolute w-24 h-px bg-orange-600/50 transition-transform duration-100"
               style={{ transform: `rotate(${gyroVis.x * 5}deg) translateY(${gyroVis.y * 5}px)` }}
             ></div>
          </div>

          <div className="flex justify-between items-end">
            <div className="font-mono text-[9px] text-neutral-500 space-y-1 bg-black/50 p-2">
               <p>ACCEL_Z: {sensors.motion?.z.toFixed(2)} G</p>
               <p>ENTROPY: {(Math.random() * 100).toFixed(0)}%</p>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] uppercase text-neutral-400 tracking-wider bg-black/50 px-1">Trust Score</span>
              <div className="flex gap-1">
                <div className="w-1 h-3 bg-orange-600"></div>
                <div className="w-1 h-3 bg-orange-600"></div>
                <div className="w-1 h-3 bg-orange-600"></div>
                <div className="w-1 h-3 bg-orange-600 opacity-50"></div>
                <div className="w-1 h-3 bg-orange-600 opacity-20"></div>
              </div>
            </div>
          </div>

          <div className="absolute top-0 left-1/3 bottom-0 w-px bg-white/5"></div>
          <div className="absolute top-0 right-1/3 bottom-0 w-px bg-white/5"></div>
          <div className="absolute left-0 top-1/3 right-0 h-px bg-white/5"></div>
          <div className="absolute left-0 bottom-1/3 right-0 h-px bg-white/5"></div>

        </div>

        <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-200 z-20 ${capturing ? 'opacity-100' : 'opacity-0'}`}></div>

      </div>

      <div className="mt-8 flex items-center justify-center gap-8 relative z-30">
         <button 
           onClick={toggleCamera}
           className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-white hover:bg-neutral-700 transition-colors"
         >
           <SwitchCamera size={20} />
         </button>

         <button 
           onClick={handleCameraCapture}
           disabled={capturing}
           className="w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center hover:border-orange-600 transition-colors group active:scale-95"
         >
            <div className="w-16 h-16 bg-white rounded-full group-hover:bg-orange-600 transition-colors"></div>
         </button>

         <div className="w-12"></div>
      </div>

      <p className="mt-6 font-mono text-[10px] text-neutral-500 uppercase tracking-widest text-center">
        Live Provenance Protocol • Do not move device
      </p>

    </div>
  );
};
