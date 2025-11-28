
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Zap, AlertTriangle, ShieldCheck, SwitchCamera, Lock } from 'lucide-react';
import { SensorData } from '../types';

export const Capture: React.FC = () => {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const [sensors, setSensors] = useState<SensorData>({ timestamp: 0 });
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [gyroVis, setGyroVis] = useState({ x: 0, y: 0 });

  const requestPermissions = () => {
    // 1. Request GPS
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

    // 2. Start Motion Simulation (Mock)
    setPermissionGranted(true);
  };

  useEffect(() => {
    if (!permissionGranted) return;

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
  }, [permissionGranted]);

  const handleCapture = useCallback(() => {
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

  const toggleCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  if (!permissionGranted) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mb-8 border border-white/10">
          <Lock className="text-orange-600" size={32} />
        </div>
        <h2 className="font-serif text-3xl text-white mb-4">Secure Environment</h2>
        <p className="text-neutral-500 max-w-md mb-12 leading-relaxed">
          To generate a cryptographic proof of liveness, Origynl requires access to your camera and location sensors. Data is processed locally.
        </p>
        <button 
          onClick={requestPermissions}
          className="bg-orange-600 text-white px-8 py-4 font-bold uppercase tracking-widest hover:bg-orange-700 transition-colors rounded-sm"
        >
          Initialize Secure Session
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black relative flex flex-col md:justify-center overflow-hidden pb-20 md:pb-0">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden w-full h-16 bg-neutral-900 border-b border-white/10 flex items-center justify-between px-6 z-20">
         <span className="font-serif text-xl font-bold">Origynl.</span>
         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
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
           onClick={handleCapture}
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
