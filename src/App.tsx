import React, { useState, useEffect } from 'react';
import { ImpactInputs, FlightParameters3D, SimulationResults } from './types';
import { simulationService } from './services/simulationEngine';
import { soundEffects } from './utils/audio';
import { TopHeader } from './components/TopHeader';
import { ControlSidebar } from './components/ControlSidebar';
import { TacticalMap } from './components/TacticalMap';
import { Trajectory3D } from './components/Trajectory3D';

export default function App() {
  const [activeTab, setActiveTab] = useState<'map' | '3d'>('map');
  const [crtEnabled, setCrtEnabled] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

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

  // Initial simulation run on mount
  useEffect(() => {
    handleSimulateMap(mapInputs);
  }, []);

  const handleSimulateMap = async (inputs: ImpactInputs) => {
    setIsSimulating(true);
    try {
      const results = await simulationService.runSimulation(inputs);
      setSimulationResults(results);
    } catch (err) {
      console.error('Simulation execution error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCoordinatesChange = (lat: number, lon: number) => {
    const updated = { ...mapInputs, latitude: lat, longitude: lon };
    setMapInputs(updated);
    handleSimulateMap(updated);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEffects.enabled = next;
    if (next) soundEffects.beep(880, 0.05);
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-[#050505] text-[#e3e2e5] font-mono overflow-hidden relative select-none">
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
        />

        {/* Right Side: Primary Visualizers */}
        <main className="flex-1 relative flex flex-col h-full bg-[#050505] overflow-hidden">
          {/* Tactical 2D Cartographic Map View */}
          <div className={`w-full h-full relative ${activeTab === 'map' ? 'block' : 'hidden'}`}>
            <TacticalMap
              inputs={mapInputs}
              onCoordinatesChange={handleCoordinatesChange}
              simulationResults={simulationResults}
              onSimulate={handleSimulateMap}
              isSimulating={isSimulating}
            />
          </div>

          {/* 3D Holographic Orbit & Trajectory Simulator */}
          <div className={`w-full h-full relative ${activeTab === '3d' ? 'block' : 'hidden'}`}>
            <Trajectory3D
              flightParams={flight3D}
              onSimResultsUpdate={setSim3DResults}
              runSimTrigger={run3DTrigger}
              resetSimTrigger={reset3DTrigger}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
