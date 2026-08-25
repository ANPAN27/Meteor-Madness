import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Orbit, Shield, Zap, ChevronRight, AlertTriangle, Radio, Eye } from 'lucide-react';

function useStaggerReveal(delay: number) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return visible;
}

function ImpactRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border border-[#00d8e6]/20"
          style={{
            width: `${120 + i * 100}px`,
            height: `${120 + i * 100}px`,
            animation: `impact-ring 4s ${i * 0.6}s ease-out infinite`,
          }}
        />
      ))}
      <div className="absolute w-3 h-3 rounded-full bg-[#00d8e6]/60 shadow-[0_0_30px_8px_rgba(0,216,230,0.3)]" style={{ animation: 'impact-pulse 2s ease-in-out infinite' }} />
    </div>
  );
}

function OrbitalLines() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]" viewBox="0 0 1200 800">
      <ellipse cx="600" cy="400" rx="500" ry="200" fill="none" stroke="#00d8e6" strokeWidth="0.5" strokeDasharray="4 8" style={{ animation: 'orbit-spin 30s linear infinite' }} />
      <ellipse cx="600" cy="400" rx="350" ry="140" fill="none" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="3 6" style={{ animation: 'orbit-spin 22s linear infinite reverse' }} />
      <ellipse cx="600" cy="400" rx="200" ry="80" fill="none" stroke="#00d8e6" strokeWidth="0.5" strokeDasharray="2 5" style={{ animation: 'orbit-spin 15s linear infinite' }} />
      {/* Impactor dot */}
      <circle r="3" fill="#f59e0b" style={{ offsetPath: "path('M100,400 A500,200 0 1 1 1100,400')", animation: 'orbit-move 12s linear infinite' }}>
      </circle>
    </svg>
  );
}

function ScanLine() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d8e6]/30 to-transparent"
        style={{ animation: 'scan-down 6s linear infinite' }}
      />
    </div>
  );
}

function TerminalBlock() {
  const lines = [
    { t: 0, text: 'MM-SIM-PRTCL v4.0', color: 'text-neutral-500' },
    { t: 200, text: 'GEOSPATIAL ENGINE .......... ONLINE', color: 'text-[#00d8e6]' },
    { t: 400, text: 'ORBITAL MECHANICS .......... ONLINE', color: 'text-[#00d8e6]' },
    { t: 600, text: 'BLAST PROPAGATION .......... ONLINE', color: 'text-[#00d8e6]' },
    { t: 800, text: 'SEISMIC COUPLING ........... ONLINE', color: 'text-[#00d8e6]' },
    { t: 1000, text: 'ALL SYSTEMS NOMINAL', color: 'text-amber-400' },
  ];
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    const timers = lines.map((l, i) =>
      setTimeout(() => setVisible(i + 1), l.t + 300)
    );
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="font-mono text-[10px] md:text-[11px] space-y-1 select-none">
      {lines.slice(0, visible).map((l, i) => (
        <div key={i} className={`${l.color} tracking-wider`} style={{ animation: 'line-appear 0.3s ease-out' }}>
          <span className="text-neutral-600 mr-2">{'>'}</span>{l.text}
        </div>
      ))}
      {visible < lines.length && <span className="inline-block w-1.5 h-3 bg-[#00d8e6] animate-pulse" />}
    </div>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') navigate('/dashboard');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const s1 = useStaggerReveal(600);
  const s2 = useStaggerReveal(900);
  const s3 = useStaggerReveal(1200);
  const s4 = useStaggerReveal(1500);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e3e2e5] font-mono overflow-x-hidden">
      {/* Fixed background layers */}
      <div className="crt-overlay" />
      <div className="fixed inset-0 z-0" style={{
        backgroundImage: 'linear-gradient(rgba(0,216,230,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,216,230,0.15) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
        opacity: 0.04,
      }} />

      {/* Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 h-12 border-b transition-all duration-300 flex items-center justify-between px-6 ${scrolled ? 'border-[#1e222b] bg-[#0e1015]/95 backdrop-blur-md' : 'border-transparent bg-transparent'}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00d8e6] animate-pulse" />
          <span className="font-mono text-xs font-semibold tracking-wider text-neutral-200 uppercase">
            MM-SIM-PRTCL <span className="text-neutral-500 font-normal">// V4.0</span>
          </span>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="font-mono text-[10px] text-neutral-400 hover:text-[#00d8e6] uppercase tracking-wider transition-colors"
        >
          Open Dashboard
        </button>
      </nav>

      {/* ===== HERO ===== */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Concentric impact rings */}
        <ImpactRings />

        {/* Orbital trajectory lines */}
        <OrbitalLines />

        {/* Scan line */}
        <ScanLine />

        {/* Radial gradient backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,216,230,0.06)_0%,transparent_60%)]" />

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          {/* Terminal boot */}
          <div className={`mb-10 transition-all duration-700 ${s1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <TerminalBlock />
          </div>

          {/* Badge */}
          <div className={`inline-flex items-center gap-2 border border-amber-800/50 bg-amber-950/30 px-3 py-1.5 rounded-[2px] mb-8 transition-all duration-700 ${s2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span className="font-mono text-[10px] font-medium text-amber-400 uppercase tracking-wider">
              Planetary Defense Initiative
            </span>
          </div>

          {/* Title */}
          <h1 className={`transition-all duration-1000 ${s2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="block font-mono text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-white leading-[0.9]">
              METEOR
            </span>
            <span className="block font-mono text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-[#00d8e6] leading-[0.9] mt-1" style={{ textShadow: '0 0 60px rgba(0,216,230,0.3)' }}>
              MADNESS
            </span>
          </h1>

          {/* Subtitle */}
          <p className={`mt-8 font-sans text-base md:text-lg text-neutral-400 max-w-xl mx-auto leading-relaxed transition-all duration-700 ${s3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Tactical impact simulator for kinetic planetary defense.
            <br className="hidden md:block" />
            Model strikes. Compute devastation. Visualize orbital entry.
          </p>

          {/* CTA */}
          <div className={`mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 ${s4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <button
              onClick={() => navigate('/dashboard')}
              className="group relative flex items-center gap-2.5 bg-[#00d8e6] text-[#090a0d] font-mono text-xs font-bold uppercase tracking-wider px-8 py-3.5 rounded-[2px] hover:bg-[#22e6f3] transition-all duration-200 hover:shadow-[0_0_30px_rgba(0,216,230,0.25)]"
            >
              <Crosshair className="w-4 h-4" />
              Launch Simulation
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <span className="font-mono text-[10px] text-neutral-600 tracking-widest uppercase">or press Enter</span>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="relative z-10 border-y border-[#1e222b] bg-[#0a0c10]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-[#1e222b]">
          {[
            { icon: Zap, value: '12,847', label: 'Impact Scenarios' },
            { icon: Shield, value: '195', label: 'Countries Mapped' },
            { icon: Orbit, value: '6-TIER', label: 'Physics Models' },
            { icon: Radio, value: '5', label: 'DEFCON Levels' },
          ].map((s, i) => (
            <div key={s.label} className="px-6 py-6 flex items-center gap-3 group hover:bg-[#0e1015]/50 transition-colors">
              <s.icon className="w-5 h-5 text-[#00d8e6]/60 group-hover:text-[#00d8e6] transition-colors shrink-0" />
              <div>
                <div className="font-mono text-xl md:text-2xl font-bold text-white tabular-nums">{s.value}</div>
                <div className="font-mono text-[9px] text-neutral-500 uppercase tracking-wider mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CAPABILITIES ===== */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <span className="font-mono text-[10px] text-[#00d8e6] uppercase tracking-[0.3em]">Capabilities</span>
          <h2 className="font-mono text-3xl md:text-4xl font-bold text-white mt-3 tracking-tight">Two Views. One Truth.</h2>
          <p className="font-sans text-sm text-neutral-500 mt-3 max-w-lg mx-auto">
            Every simulation runs through a 6-tier physics engine modeling atmospheric entry,
            kinetic energy transfer, blast wave propagation, and seismic coupling.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Tactical Map Card */}
          <div className="group relative border border-[#1e222b] bg-[#0a0c10] rounded-[2px] overflow-hidden hover:border-[#00d8e6]/30 transition-all duration-500">
            {/* Mini map visualization */}
            <div className="h-48 relative overflow-hidden bg-[#090a0d]">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 60% 40%, rgba(0,216,230,0.08) 0%, transparent 50%)',
              }} />
              {/* Concentric damage rings */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200">
                {[30, 55, 85, 120].map((r, i) => (
                  <circle key={i} cx="240" cy="90" r={r} fill="none" stroke={['#ef4444','#f59e0b','#00d8e6','#3b82f6'][i]} strokeWidth="0.5" opacity={0.4 - i * 0.08} strokeDasharray="3 4" />
                ))}
                <circle cx="240" cy="90" r="3" fill="#ef4444" opacity="0.8" />
                {/* Grid */}
                {Array.from({ length: 20 }).map((_, i) => (
                  <line key={`h${i}`} x1="0" y1={i * 10} x2="400" y2={i * 10} stroke="#1e222b" strokeWidth="0.3" />
                ))}
                {Array.from({ length: 40 }).map((_, i) => (
                  <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="200" stroke="#1e222b" strokeWidth="0.3" />
                ))}
              </svg>
              <div className="absolute bottom-3 left-3 font-mono text-[9px] text-neutral-600 uppercase tracking-wider">TACTICAL VIEW</div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <Crosshair className="w-4 h-4 text-[#00d8e6]" />
                <span className="font-mono text-xs font-semibold text-neutral-200 uppercase tracking-wider">Tactical Map</span>
              </div>
              <p className="font-sans text-sm text-neutral-400 leading-relaxed mb-5">
                2D geospatial impact modeling with real-time damage zone computation.
                Concentric blast radii, thermal propagation zones, seismic felt area, and country-level intersection analysis.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['Blast Zones', 'Seismic', 'Country Borders', 'Real-time'].map((tag) => (
                  <span key={tag} className="font-mono text-[9px] text-neutral-500 border border-[#1e222b] px-2 py-0.5 rounded-[1px] uppercase tracking-wider">{tag}</span>
                ))}
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="font-mono text-[10px] text-[#00d8e6] uppercase tracking-wider hover:text-[#22e6f3] transition-colors flex items-center gap-1.5 group/btn"
              >
                Enter Module <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* 3D Trajectory Card */}
          <div className="group relative border border-[#1e222b] bg-[#0a0c10] rounded-[2px] overflow-hidden hover:border-amber-500/30 transition-all duration-500">
            {/* Mini 3D visualization */}
            <div className="h-48 relative overflow-hidden bg-[#090a0d]">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 40% 50%, rgba(245,158,11,0.06) 0%, transparent 50%)',
              }} />
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200">
                {/* Trajectory arc */}
                <path d="M50,180 Q200,20 350,160" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.5" strokeDasharray="4 3" />
                <path d="M50,180 Q200,20 350,160" fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.3" />
                {/* Earth curve */}
                <ellipse cx="350" cy="220" rx="120" ry="60" fill="none" stroke="#00d8e6" strokeWidth="0.5" opacity="0.3" />
                {/* Atmosphere layer */}
                <ellipse cx="350" cy="220" rx="130" ry="65" fill="none" stroke="#00d8e6" strokeWidth="0.3" opacity="0.15" strokeDasharray="2 4" />
                {/* Impactor */}
                <circle cx="200" cy="60" r="4" fill="#f59e0b" opacity="0.8" />
                <circle cx="200" cy="60" r="8" fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.3" />
                {/* Stars */}
                {[[80,30],[150,45],[320,25],[380,60],[50,90],[290,100]].map(([x,y], i) => (
                  <circle key={i} cx={x} cy={y} r="0.5" fill="#e5e7eb" opacity="0.3" />
                ))}
              </svg>
              <div className="absolute bottom-3 left-3 font-mono text-[9px] text-neutral-600 uppercase tracking-wider">3D TRAJECTORY</div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <Orbit className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-xs font-semibold text-neutral-200 uppercase tracking-wider">3D Trajectory</span>
              </div>
              <p className="font-sans text-sm text-neutral-400 leading-relaxed mb-5">
                Full orbital mechanics simulation with atmospheric entry physics.
                Chase, ground-zero, and orbital camera modes with real-time altitude, velocity, and Mach number telemetry.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['Orbital Mechanics', '3 Cameras', 'Atmospheric Entry', 'Playback'].map((tag) => (
                  <span key={tag} className="font-mono text-[9px] text-neutral-500 border border-[#1e222b] px-2 py-0.5 rounded-[1px] uppercase tracking-wider">{tag}</span>
                ))}
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="font-mono text-[10px] text-amber-400 uppercase tracking-wider hover:text-amber-300 transition-colors flex items-center gap-1.5 group/btn"
              >
                Enter Module <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BOTTOM CTA ===== */}
      <section className="relative z-10 border-t border-[#1e222b] bg-[#0a0c10]/60">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <Eye className="w-6 h-6 text-[#00d8e6]/40 mx-auto mb-4" />
          <h3 className="font-mono text-xl md:text-2xl font-bold text-white tracking-tight">Ready to Simulate?</h3>
          <p className="font-sans text-sm text-neutral-500 mt-2 mb-8 max-w-md mx-auto">
            Configure impact parameters, select a target, and observe cascading destruction in real-time.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="group inline-flex items-center gap-2.5 bg-[#00d8e6] text-[#090a0d] font-mono text-xs font-bold uppercase tracking-wider px-8 py-3.5 rounded-[2px] hover:bg-[#22e6f3] transition-all duration-200 hover:shadow-[0_0_30px_rgba(0,216,230,0.25)]"
          >
            <Crosshair className="w-4 h-4" />
            Enter Command Center
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#1e222b] bg-[#090a0d] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="font-mono text-[9px] text-neutral-600 tracking-wider uppercase">
            MM-SIM-PRTCL // Meteor Madness
          </div>
          <div className="font-mono text-[9px] text-neutral-600 tracking-wider">
            STATUS: <span className="text-[#00d8e6]">NOMINAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
