import React, { useState, useEffect } from 'react';
import { ShieldAlert, Volume2, VolumeX, Tv, Radio, Crosshair, Orbit } from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface TopHeaderProps {
  activeTab: 'map' | '3d';
  onTabChange: (tab: 'map' | '3d') => void;
  threatLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE / CATASTROPHIC' | 'STANDBY';
  crtEnabled: boolean;
  onToggleCrt: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onTabChange,
  threatLevel = 'STANDBY',
  crtEnabled,
  onToggleCrt,
  soundEnabled,
  onToggleSound
}) => {
  const [timeUtc, setTimeUtc] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeUtc(now.toISOString().replace('T', ' ').replace('Z', ' UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getDefconBadge = () => {
    switch (threatLevel) {
      case 'SEVERE / CATASTROPHIC':
        return { text: 'DEFCON 1 // EXTINCTION LEVEL', color: 'text-red-400 border-red-900/60 bg-red-950/40' };
      case 'HIGH':
        return { text: 'DEFCON 2 // CONTINENTAL THREAT', color: 'text-orange-400 border-orange-900/60 bg-orange-950/40' };
      case 'MODERATE':
        return { text: 'DEFCON 3 // REGIONAL IMPACT', color: 'text-amber-400 border-amber-900/60 bg-amber-950/40' };
      case 'LOW':
        return { text: 'DEFCON 4 // LOCALIZED BOLIDE', color: 'text-teal-400 border-teal-900/60 bg-teal-950/40' };
      default:
        return { text: 'DEFCON 5 // SENSORS NOMINAL', color: 'text-neutral-400 border-neutral-800 bg-neutral-900/50' };
    }
  };

  const defcon = getDefconBadge();

  return (
    <header className="w-full h-12 bg-[#0e1015] border-b border-[#1e222b] px-4 flex items-center justify-between gap-4 shrink-0 z-30 select-none">
      {/* Brand & Telemetry Identification */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border border-[#1e222b] px-2.5 py-1 bg-[#14171e] rounded-[2px]">
          <span className="w-2 h-2 rounded-full bg-[#00d8e6] animate-pulse"></span>
          <span className="font-mono text-xs font-semibold tracking-wider text-neutral-200 uppercase">
            MM-SIM-PRTCL <span className="text-neutral-500 font-normal">// V4.0</span>
          </span>
        </div>
        <div className="hidden xl:block font-mono text-[10px] text-neutral-400 tracking-wider uppercase border-l border-[#1e222b] pl-3">
          Planetary Defense Telemetry & Kinetic Impact Matrix
        </div>
      </div>

      {/* Center View Switcher Segmented Control */}
      <div className="flex items-center bg-[#090a0d] border border-[#1e222b] p-0.5 rounded-[2px]">
        <button
          onClick={() => {
            soundEffects.click();
            onTabChange('map');
          }}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono tracking-wider uppercase transition-colors rounded-[1px] ${
            activeTab === 'map'
              ? 'bg-[#1e222b] text-[#00d8e6] font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>Tactical Map</span>
        </button>
        <button
          onClick={() => {
            soundEffects.click();
            onTabChange('3d');
          }}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono tracking-wider uppercase transition-colors rounded-[1px] ${
            activeTab === '3d'
              ? 'bg-[#1e222b] text-[#00d8e6] font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Orbit className="w-3.5 h-3.5" />
          <span>3D Trajectory</span>
        </button>
      </div>

      {/* Right Telemetry Clock & Utilities */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* DEFCON Badge */}
        <div className={`hidden md:flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] font-medium tracking-wider rounded-[2px] ${defcon.color}`}>
          <ShieldAlert className="w-3 h-3" />
          <span>{defcon.text}</span>
        </div>

        {/* UTC Clock */}
        <div className="font-mono text-xs text-neutral-300 tabular-nums tracking-wider bg-[#090a0d] border border-[#1e222b] px-2.5 py-1 rounded-[2px]">
          {timeUtc || 'SYNCING...'}
        </div>

        {/* CRT Scanline Toggle */}
        <button
          onClick={() => {
            soundEffects.click();
            onToggleCrt();
          }}
          title={crtEnabled ? 'Disable CRT scanline filter' : 'Enable CRT scanline filter'}
          className={`p-1.5 border rounded-[2px] transition-colors ${
            crtEnabled ? 'border-teal-800 text-[#00d8e6] bg-teal-950/40' : 'border-[#1e222b] text-neutral-400 hover:text-neutral-200 hover:bg-[#14171e]'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
        </button>

        {/* Audio Toggle */}
        <button
          onClick={() => {
            onToggleSound();
          }}
          title={soundEnabled ? 'Mute terminal audio' : 'Enable terminal audio'}
          className={`p-1.5 border rounded-[2px] transition-colors ${
            soundEnabled ? 'border-teal-800 text-[#00d8e6] bg-teal-950/40' : 'border-[#1e222b] text-neutral-400 hover:text-neutral-200 hover:bg-[#14171e]'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
