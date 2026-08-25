import React, { useState, useEffect, useCallback } from 'react';
import { ImpactInputs, FlightParameters3D, SimulationResults } from './types';
import { simulationService } from './services/simulationEngine';
import { soundEffects } from './utils/audio';
import { TopHeader } from './components/TopHeader';
import { ControlSidebar } from './components/ControlSidebar';
import { TacticalMap } from './components/TacticalMap';
import { ContextMenu, ContextMenuItem } from './components/ContextMenu';
import { PanelLeft, PanelBottomOpen } from 'lucide-react';

const Trajectory3D = React.lazy(() =>
  import('./components/Trajectory3D').then((m) => ({ default: m.Trajectory3D }))
);

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'map' | '3d'>('map');
  const [crtEnabled, setCrtEnabled] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [showBottomPanels, setShowBottomPanels] = useState<boolean>(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  // Tactical Map Inputs State
  const [mapInputs, setMapInputs] = useState<ImpactInputs>({
    diameter: 50,
    velocity: 15000,
    latitude: 34.05,
    longitude: -118.25,
    density: 2600,
    impactAngle: 45
  });

  // 3D Flight Parameters State
  const [flight3D, setFlight3D] = useState<FlightParameters3D>({
    velocity: 20,
    mass: 100,
    diameter: 1,
    angle: 45,
    distance: 100
  });

  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // 3D trigger states
  const [run3DTrigger, setRun3DTrigger] = useState<number>(0);
  const [reset3DTrigger, setReset3DTrigger] = useState<number>(0);
  const [sim3DResults, setSim3DResults] = useState<{
    impact: boolean;
    energyMT: number;
    classification: string;
    description: string;
    craterKm: number;
    location: string;
  } | null>(null);

  // No auto-simulation on mount - user triggers manually

  const handleSimulateMap = useCallback(async (inputs: ImpactInputs) => {
    setIsSimulating(true);
    try {
      const results = await simulationService.runSimulation(inputs);
      setSimulationResults(results);
    } catch (err) {
      console.error('Simulation execution error:', err);
    } finally {
      setIsSimulating(false);
    }
  }, []);

  const handleCoordinatesChange = useCallback((lat: number, lon: number) => {
    setMapInputs((prev) => {
      const updated = { ...prev, latitude: lat, longitude: lon };
      handleSimulateMap(updated);
      return updated;
    });
  }, [handleSimulateMap]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEffects.enabled = next;
    if (next) soundEffects.beep(880, 0.05);
  };

  // Disable browser right-click globally
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const items: ContextMenuItem[] = activeTab === 'map'
      ? [
          { label: 'Center on Cursor', action: () => soundEffects.beep(1100, 0.05) },
          { label: 'Run Simulation', action: () => handleSimulateMap(mapInputs), shortcut: 'Enter' },
          { label: 'Reset Parameters', action: () => { setMapInputs({ diameter: 50, velocity: 15000, latitude: 34.05, longitude: -118.25, density: 2600, impactAngle: 45 }); }, shortcut: 'R' },
          { type: 'separator' },
          { label: 'Switch to 3D View', action: () => setActiveTab('3d'), shortcut: 'Tab' },
          { label: `${crtEnabled ? 'Disable' : 'Enable'} CRT Filter`, action: () => setCrtEnabled(!crtEnabled) },
          { label: `${soundEnabled ? 'Mute' : 'Unmute'} Audio`, action: () => handleToggleSound(), shortcut: 'M' },
        ]
      : [
          { label: 'Play / Pause', action: () => soundEffects.click(), shortcut: 'Space' },
          { label: 'Reset Trajectory', action: () => setReset3DTrigger((p) => p + 1), shortcut: 'R' },
          { type: 'separator' },
          { label: 'Switch to Map View', action: () => setActiveTab('map'), shortcut: 'Tab' },
          { label: `${crtEnabled ? 'Disable' : 'Enable'} CRT Filter`, action: () => setCrtEnabled(!crtEnabled) },
          { label: `${soundEnabled ? 'Mute' : 'Unmute'} Audio`, action: () => handleToggleSound(), shortcut: 'M' },
        ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  }, [activeTab, crtEnabled, soundEnabled, mapInputs, handleSimulateMap, handleToggleSound]);

  // Close context menu on any click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', close);
    };
  }, [contextMenu]);

  return (
    <div
      className="flex flex-col w-screen h-screen bg-[#050505] text-[#e3e2e5] font-mono overflow-hidden relative select-none"
      onContextMenu={handleContextMenu}
    >
      {/* Optional CRT Scanline / Noise Overlay */}
      {crtEnabled && <div className="crt-overlay" />}

      {/* Top Mission Control Command Bar */}
      <TopHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        threatLevel={simulationResults?.mitigation.threatLevel}
        crtEnabled={crtEnabled}
        onToggleCrt={() => setCrtEnabled(!crtEnabled)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Main Terminal Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Side: Control & Parameter Sidebar */}
        {showSidebar && (
          <ControlSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            mapInputs={mapInputs}
            onMapInputsChange={setMapInputs}
            onSimulateMap={handleSimulateMap}
            simulationResults={simulationResults}
            isSimulating={isSimulating}
            flight3D={flight3D}
            onFlight3DChange={setFlight3D}
            onRunSim3D={() => setRun3DTrigger((prev) => prev + 1)}
            onResetSim3D={() => setReset3DTrigger((prev) => prev + 1)}
            sim3DResults={sim3DResults}
            onClose={() => setShowSidebar(false)}
          />
        )}

        {/* Restore Sidebar Button */}
        {!showSidebar && (
          <button
            onClick={() => setShowSidebar(true)}
            title="Show sidebar"
            className="absolute top-1 left-1 z-30 w-7 h-7 flex items-center justify-center bg-[#0e1015] border border-[#1e222b] text-neutral-400 hover:text-[#00d8e6] hover:border-[#00d8e6] rounded-[2px] transition-colors"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Restore Bottom Panels Button */}
        {!showBottomPanels && (
          <button
            onClick={() => setShowBottomPanels(true)}
            title="Show telemetry panels"
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 h-7 px-3 flex items-center gap-1.5 bg-[#0e1015] border border-[#1e222b] text-neutral-400 hover:text-[#00d8e6] hover:border-[#00d8e6] rounded-[2px] transition-colors font-mono text-[10px] tracking-wider uppercase"
          >
            <PanelBottomOpen className="w-3.5 h-3.5" />
            <span>Telemetry</span>
          </button>
        )}

        {/* Right Side: Primary Visualizers - conditionally rendered to avoid mounting both */}
        <main className="flex-1 relative flex flex-col h-full bg-[#050505] overflow-hidden">
          {activeTab === 'map' && (
            <TacticalMap
              inputs={mapInputs}
              onCoordinatesChange={handleCoordinatesChange}
              simulationResults={simulationResults}
              onSimulate={handleSimulateMap}
              isSimulating={isSimulating}
              showBottomPanels={showBottomPanels}
              onToggleBottomPanels={() => setShowBottomPanels((p) => !p)}
            />
          )}

          {activeTab === '3d' && (
            <React.Suspense fallback={
              <div className="flex items-center justify-center h-full text-neutral-500 font-mono text-xs">
                Loading 3D Engine...
              </div>
            }>
              <Trajectory3D
                flightParams={flight3D}
                onSimResultsUpdate={setSim3DResults}
                runSimTrigger={run3DTrigger}
                resetSimTrigger={reset3DTrigger}
              />
            </React.Suspense>
          )}
        </main>
      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
