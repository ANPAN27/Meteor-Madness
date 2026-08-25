import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FlightParameters3D, ImpactInputs } from '../types';
import { soundEffects } from '../utils/audio';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Eye,
  Crosshair,
  Zap,
  Flame,
  ShieldAlert,
  Compass
} from 'lucide-react';

interface Trajectory3DProps {
  flightParams: FlightParameters3D;
  targetCoords?: { lat: number; lon: number };
  onSimResultsUpdate: (results: {
    impact: boolean;
    energyMT: number;
    classification: string;
    description: string;
    craterKm: number;
    location: string;
  } | null) => void;
  runSimTrigger: number;
  resetSimTrigger: number;
}

interface TrajectoryPoint {
  position: THREE.Vector3;
  altitudeKm: number;
  velocityKmS: number;
  timeSec: number;
  phase: 'deep_space' | 'exosphere' | 'entry_interface' | 'plasma_sheath' | 'terminal_impact';
}

export const Trajectory3D: React.FC<Trajectory3DProps> = ({
  flightParams,
  targetCoords = { lat: 34.05, lon: -118.25 },
  onSimResultsUpdate,
  runSimTrigger,
  resetSimTrigger
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);

  const earthRef = useRef<THREE.Mesh | null>(null);
  const atmosphereRef = useRef<THREE.Mesh | null>(null);
  const asteroidRef = useRef<THREE.Mesh | null>(null);
  const plasmaGlowRef = useRef<THREE.Mesh | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const trailLineRef = useRef<THREE.Line | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const impactGroupRef = useRef<THREE.Group | null>(null);

  const animationIdRef = useRef<number | null>(null);
  const trajectoryDataRef = useRef<TrajectoryPoint[]>([]);

  // Playback & Timeline Scrubbing State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timelineProgress, setTimelineProgress] = useState<number>(0); // 0.0 to 1.0
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [cameraMode, setCameraMode] = useState<'orbital' | 'chase' | 'ground'>('orbital');
  const [simState, setSimState] = useState<'idle' | 'running' | 'impacted'>('idle');

  // Real-time HUD Metrics
  const [hudMetrics, setHudMetrics] = useState<{
    altKm: number;
    velocityKmS: number;
    dynamicPressureKPa: number;
    shockTempK: number;
    timeToImpactSec: number;
    phaseName: string;
  }>({
    altKm: flightParams.distance * 1000,
    velocityKmS: flightParams.velocity,
    dynamicPressureKPa: 0,
    shockTempK: 280,
    timeToImpactSec: 60,
    phaseName: 'Deep Space Approach'
  });

  // Physical Constants
  const EARTH_RADIUS_UNITS = 6.0; // 3D units for Earth radius (6,371 km)
  const KM_TO_UNITS = EARTH_RADIUS_UNITS / 6371.0;

  // Convert Latitude / Longitude to Cartesian Coordinates on Earth Surface
  const latLonToVector3 = useCallback((lat: number, lon: number, altitudeKm: number = 0): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const radius = EARTH_RADIUS_UNITS + altitudeKm * KM_TO_UNITS;

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  }, [KM_TO_UNITS]);

  // Compute Physics Descent Path
  const computeDescentTrajectory = useCallback((): TrajectoryPoint[] => {
    const lat = targetCoords.lat;
    const lon = targetCoords.lon;
    const angleDeg = Math.min(90, Math.max(10, flightParams.angle));
    const angleRad = (angleDeg * Math.PI) / 180;
    const baseVelocity = flightParams.velocity; // km/s
    const totalDistanceKm = flightParams.distance * 1000; // km

    const targetPos = latLonToVector3(lat, lon, 0);
    const surfaceNormal = targetPos.clone().normalize();

    // Compute tangential approach vector
    const up = new THREE.Vector3(0, 1, 0);
    let tangent = new THREE.Vector3().crossVectors(surfaceNormal, up).normalize();
    if (tangent.lengthSq() < 0.001) {
      tangent = new THREE.Vector3().crossVectors(surfaceNormal, new THREE.Vector3(1, 0, 0)).normalize();
    }

    // Approach vector entering at angleDeg relative to surface horizon
    const approachDir = tangent.clone().multiplyScalar(Math.cos(angleRad)).add(surfaceNormal.clone().multiplyScalar(Math.sin(angleRad))).normalize();

    const points: TrajectoryPoint[] = [];
    const totalSteps = 200;

    for (let i = 0; i <= totalSteps; i++) {
      const fraction = i / totalSteps; // 0 = start, 1 = impact at targetPos
      const altitudeKm = totalDistanceKm * Math.pow(1 - fraction, 1.8);
      
      // Gravitational acceleration increases velocity near Earth
      const gravFactor = Math.sqrt(1 + (EARTH_RADIUS_UNITS / (EARTH_RADIUS_UNITS + altitudeKm * KM_TO_UNITS)) * 0.45);
      const currentVelocity = baseVelocity * gravFactor;

      // Position along curved descent path
      const radialPos = latLonToVector3(lat, lon, altitudeKm);
      // Add horizontal offset for higher altitudes based on approach direction
      const horizontalOffsetDist = (altitudeKm / Math.tan(Math.max(0.15, angleRad))) * KM_TO_UNITS;
      const finalPos = radialPos.clone().add(approachDir.clone().multiplyScalar(horizontalOffsetDist * (1 - fraction)));

      // Determine Atmospheric Flight Phase
      let phase: TrajectoryPoint['phase'] = 'deep_space';
      if (altitudeKm <= 0.5) phase = 'terminal_impact';
      else if (altitudeKm <= 60) phase = 'plasma_sheath';
      else if (altitudeKm <= 120) phase = 'entry_interface';
      else if (altitudeKm <= 1000) phase = 'exosphere';

      const timeRemaining = (altitudeKm / Math.max(1, currentVelocity));

      points.push({
        position: fraction === 1 ? targetPos : finalPos,
        altitudeKm: Math.round(altitudeKm),
        velocityKmS: Number(currentVelocity.toFixed(2)),
        timeSec: Number(timeRemaining.toFixed(1)),
        phase
      });
    }

    return points;
  }, [flightParams, targetCoords, latLonToVector3, KM_TO_UNITS]);

  // Setup Three.js Scene
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 2000);
    camera.position.set(0, 18, 32);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050505, 1);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 7;
    controls.maxDistance = 300;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x334455, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    sunLight.position.set(120, 60, 90);
    scene.add(sunLight);

    // Deep space coordinate grid helper
    const gridHelper = new THREE.GridHelper(120, 60, 0x00d8e6, 0x14171e);
    gridHelper.position.y = -EARTH_RADIUS_UNITS - 2;
    scene.add(gridHelper);

    // Earth Sphere
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS_UNITS, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0x0a101d,
      emissive: 0x03060c,
      specular: 0x00d8e6,
      shininess: 30
    });

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_atmos_2048.jpg',
      (tex) => {
        earthMat.map = tex;
        earthMat.needsUpdate = true;
      },
      undefined,
      () => {
        earthMat.wireframe = true;
      }
    );

    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthRef.current = earthMesh;
    scene.add(earthMesh);

    // Atmosphere Karman Layer (100km altitude marker shell)
    const atmGeo = new THREE.SphereGeometry(EARTH_RADIUS_UNITS + 100 * KM_TO_UNITS, 36, 36);
    const atmMat = new THREE.MeshBasicMaterial({
      color: 0x00d8e6,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    const atmMesh = new THREE.Mesh(atmGeo, atmMat);
    atmosphereRef.current = atmMesh;
    earthMesh.add(atmMesh);

    // Asteroid Mesh
    const asteroidGeo = new THREE.IcosahedronGeometry(0.35, 1);
    const asteroidMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.8,
      metalness: 0.2,
      wireframe: false
    });
    const asteroidMesh = new THREE.Mesh(asteroidGeo, asteroidMat);
    asteroidRef.current = asteroidMesh;
    scene.add(asteroidMesh);

    // Plasma Ionization Glow Shell around Asteroid
    const plasmaGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const plasmaMat = new THREE.MeshBasicMaterial({
      color: 0xffa500,
      transparent: true,
      opacity: 0.0,
      wireframe: true
    });
    const plasmaMesh = new THREE.Mesh(plasmaGeo, plasmaMat);
    plasmaGlowRef.current = plasmaMesh;
    asteroidMesh.add(plasmaMesh);

    // Full Descent Trajectory Line
    const trajGeo = new THREE.BufferGeometry();
    const trajMat = new THREE.LineBasicMaterial({
      color: 0x2a303d,
      linewidth: 1
    });
    const trajLine = new THREE.Line(trajGeo, trajMat);
    trajectoryLineRef.current = trajLine;
    scene.add(trajLine);

    // Dynamic Trail Line
    const trailGeo = new THREE.BufferGeometry();
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x00d8e6,
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    trailLineRef.current = trailLine;
    scene.add(trailLine);

    // Tactical Altitude Milestone Overlays Group
    const markersGroup = new THREE.Group();
    markersGroupRef.current = markersGroup;
    scene.add(markersGroup);

    // Impact / Crater Overlays Group
    const impactGroup = new THREE.Group();
    impactGroupRef.current = impactGroup;
    scene.add(impactGroup);

    // Main 60fps Render Loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
    };
  }, [KM_TO_UNITS]);

  // Re-compute trajectory and build visual milestone markers whenever parameters change
  useEffect(() => {
    const trajectory = computeDescentTrajectory();
    trajectoryDataRef.current = trajectory;

    if (trajectory.length === 0) return;

    // Update Full Trajectory Line Geometry
    if (trajectoryLineRef.current) {
      const positions = trajectory.map((p) => p.position);
      const geo = new THREE.BufferGeometry().setFromPoints(positions);
      trajectoryLineRef.current.geometry.dispose();
      trajectoryLineRef.current.geometry = geo;
    }

    // Rebuild Milestone Marker Rings along trajectory
    if (markersGroupRef.current) {
      while (markersGroupRef.current.children.length > 0) {
        markersGroupRef.current.remove(markersGroupRef.current.children[0]);
      }

      // Milestones: 1000km Exosphere, 100km Karman Line, 50km Plasma Entry, 0km Target
      const milestoneAltitudes = [1000, 100, 50, 0];

      milestoneAltitudes.forEach((targetAlt) => {
        // Find closest point
        let closest = trajectory[0];
        let minDiff = Infinity;
        trajectory.forEach((p) => {
          const diff = Math.abs(p.altitudeKm - targetAlt);
          if (diff < minDiff) {
            minDiff = diff;
            closest = p;
          }
        });

        if (closest) {
          const color = targetAlt === 0 ? 0xef4444 : targetAlt <= 50 ? 0xf59e0b : 0x00d8e6;
          const ringGeo = new THREE.RingGeometry(0.4, 0.5, 24);
          const ringMat = new THREE.MeshBasicMaterial({
            color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
          });
          const ringMesh = new THREE.Mesh(ringGeo, ringMat);
          ringMesh.position.copy(closest.position);
          ringMesh.lookAt(new THREE.Vector3(0, 0, 0));
          markersGroupRef.current?.add(ringMesh);
        }
      });
    }

    // Apply current timeline scrub position
    applyTimelineProgress(timelineProgress);
  }, [flightParams, targetCoords, computeDescentTrajectory]);

  // Apply Timeline Position & Camera Position
  const applyTimelineProgress = (progress: number) => {
    const points = trajectoryDataRef.current;
    if (points.length === 0) return;

    const clamped = Math.max(0, Math.min(1, progress));
    const index = Math.min(points.length - 1, Math.floor(clamped * (points.length - 1)));
    const currentPoint = points[index];

    // Position Asteroid
    if (asteroidRef.current) {
      asteroidRef.current.position.copy(currentPoint.position);
      asteroidRef.current.rotation.x = clamped * 20;
      asteroidRef.current.rotation.y = clamped * 35;

      // Scale asteroid size based on flight parameter
      const scale = Math.max(0.3, Math.min(2.5, flightParams.diameter * 0.4));
      asteroidRef.current.scale.set(scale, scale, scale);

      // Plasma Ionization Glow intensity in lower atmosphere
      if (plasmaGlowRef.current) {
        if (currentPoint.altitudeKm <= 100 && currentPoint.altitudeKm > 0) {
          const intensity = (1 - currentPoint.altitudeKm / 100);
          (plasmaGlowRef.current.material as THREE.MeshBasicMaterial).opacity = intensity * 0.85;
          plasmaGlowRef.current.scale.set(1 + intensity * 0.5, 1 + intensity * 0.5, 1 + intensity * 0.5);
        } else {
          (plasmaGlowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.0;
        }
      }
    }

    // Update Trail Line
    if (trailLineRef.current) {
      const trailPoints = points.slice(0, index + 1).map((p) => p.position);
      if (trailPoints.length > 1) {
        const geo = new THREE.BufferGeometry().setFromPoints(trailPoints);
        trailLineRef.current.geometry.dispose();
        trailLineRef.current.geometry = geo;
      }
    }

    // Calculate Dynamic Physical Telemetry
    const dynPressure = currentPoint.altitudeKm < 100
      ? Number((0.5 * 1.225 * Math.exp(-currentPoint.altitudeKm / 7.5) * Math.pow(currentPoint.velocityKmS * 1000, 2) / 1000).toFixed(1))
      : 0;

    const shockTemp = currentPoint.altitudeKm < 120
      ? Math.min(18000, Math.round(280 + Math.pow(currentPoint.velocityKmS, 2) * 12 * Math.exp(-currentPoint.altitudeKm / 20)))
      : 280;

    let phaseName = 'Deep Space Approach';
    if (currentPoint.phase === 'terminal_impact') phaseName = 'TERMINAL IMPACT // GROUND ZERO';
    else if (currentPoint.phase === 'plasma_sheath') phaseName = 'HYPERSONIC PLASMA IONIZATION SHEATH';
    else if (currentPoint.phase === 'entry_interface') phaseName = 'ATMOSPHERIC ENTRY INTERFACE (~100 KM)';
    else if (currentPoint.phase === 'exosphere') phaseName = 'EXOSPHERE / LEO TRANSIT';

    setHudMetrics({
      altKm: currentPoint.altitudeKm,
      velocityKmS: currentPoint.velocityKmS,
      dynamicPressureKPa: dynPressure,
      shockTempK: shockTemp,
      timeToImpactSec: currentPoint.timeSec,
      phaseName
    });

    // Handle Camera Tracking Modes
    if (cameraRef.current && controlsRef.current) {
      if (cameraMode === 'chase' && asteroidRef.current) {
        const offset = new THREE.Vector3(3, 2, 4);
        cameraRef.current.position.copy(currentPoint.position).add(offset);
        controlsRef.current.target.copy(currentPoint.position);
      } else if (cameraMode === 'ground') {
        const targetPos = points[points.length - 1].position;
        const groundCamPos = targetPos.clone().multiplyScalar(1.08).add(new THREE.Vector3(0.5, 0.5, 0.5));
        cameraRef.current.position.copy(groundCamPos);
        controlsRef.current.target.copy(currentPoint.position);
      }
    }

    // Trigger Impact FX when reaching terminal ground zero
    if (clamped >= 0.99 && simState !== 'impacted') {
      triggerImpactFX(points[points.length - 1].position);
    }
  };

  // Trigger Impact Visuals
  const triggerImpactFX = (impactPos: THREE.Vector3) => {
    setSimState('impacted');
    soundEffects.impactRumble();

    if (!impactGroupRef.current) return;

    while (impactGroupRef.current.children.length > 0) {
      impactGroupRef.current.remove(impactGroupRef.current.children[0]);
    }

    // Crater disk on surface
    const craterGeo = new THREE.CircleGeometry(0.6, 24);
    const craterMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const craterMesh = new THREE.Mesh(craterGeo, craterMat);
    craterMesh.position.copy(impactPos.clone().multiplyScalar(1.002));
    craterMesh.lookAt(impactPos.clone().multiplyScalar(2));
    impactGroupRef.current.add(craterMesh);

    // Shockwave Rings
    const ringGeo = new THREE.RingGeometry(0.8, 1.4, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(craterMesh.position);
    ringMesh.rotation.copy(craterMesh.rotation);
    impactGroupRef.current.add(ringMesh);

    // Emit Results
    const massKg = flightParams.mass * 1e12;
    const velocityMs = flightParams.velocity * 1000;
    const energyJoules = 0.5 * massKg * Math.pow(velocityMs, 2);
    const energyMT = energyJoules / 4.184e15;
    const craterKm = flightParams.diameter * 2.2;

    onSimResultsUpdate({
      impact: true,
      energyMT,
      classification: energyMT > 10000 ? 'Class IV' : 'Class III',
      description: 'Atmospheric penetration with ground coupling',
      craterKm,
      location: `[${targetCoords.lat.toFixed(2)}°, ${targetCoords.lon.toFixed(2)}°]`
    });
  };

  // Playback Loop
  useEffect(() => {
    let interval: any = null;

    if (isPlaying) {
      setSimState('running');
      const stepDurationMs = 25;
      const stepIncrement = (0.0035 * speedMultiplier);

      interval = setInterval(() => {
        setTimelineProgress((prev) => {
          const next = prev + stepIncrement;
          if (next >= 1.0) {
            setIsPlaying(false);
            applyTimelineProgress(1.0);
            return 1.0;
          }
          applyTimelineProgress(next);
          return next;
        });
      }, stepDurationMs);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, speedMultiplier]);

  // Triggers from parent
  useEffect(() => {
    if (runSimTrigger > 0) {
      setTimelineProgress(0);
      setIsPlaying(true);
    }
  }, [runSimTrigger]);

  useEffect(() => {
    if (resetSimTrigger > 0) {
      handleReset();
    }
  }, [resetSimTrigger]);

  const handleReset = () => {
    setIsPlaying(false);
    setTimelineProgress(0);
    setSimState('idle');
    applyTimelineProgress(0);

    if (impactGroupRef.current) {
      while (impactGroupRef.current.children.length > 0) {
        impactGroupRef.current.remove(impactGroupRef.current.children[0]);
      }
    }

    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(0, 18, 32);
      controlsRef.current.target.set(0, 0, 0);
    }

    onSimResultsUpdate(null);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#050505] overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Top Left: N-Body Telemetry Matrix */}
      <div className="absolute top-3 left-3 font-mono text-[10px] text-neutral-300 pointer-events-none flex flex-col gap-1.5 z-10">
        <div className="border border-[#1e222b] bg-[#0e1015]/90 backdrop-blur-sm px-3 py-2 rounded-[2px] pointer-events-auto flex flex-col gap-1 shadow">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-amber-400 animate-pulse' : 'bg-[#00d8e6]'}`}></span>
            <span className="font-semibold text-neutral-200 uppercase tracking-wider">
              {hudMetrics.phaseName}
            </span>
          </div>
          <div className="text-neutral-400 text-[9px] flex items-center gap-2">
            <span>Target: [{targetCoords.lat.toFixed(2)}°, {targetCoords.lon.toFixed(2)}°]</span>
            <span>&middot;</span>
            <span>Angle: {flightParams.angle}°</span>
          </div>
        </div>

        {/* Live Vector Telemetry Card */}
        <div className="border border-[#1e222b] bg-[#0e1015]/95 backdrop-blur-sm p-3 rounded-[2px] flex flex-col gap-1.5 pointer-events-auto shadow-md min-w-[220px]">
          <div className="text-neutral-400 text-[10px] uppercase border-b border-[#1e222b] pb-1 flex justify-between">
            <span>Descent Telemetry</span>
            <span className="text-amber-400 font-semibold tabular-nums">
              T- {hudMetrics.timeToImpactSec > 0 ? `${hudMetrics.timeToImpactSec}s` : '0.0s'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-neutral-400">Altitude</span>
            <span className="text-neutral-200 font-semibold tabular-nums">{hudMetrics.altKm.toLocaleString()} km</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-neutral-400">Velocity</span>
            <span className="text-teal-400 font-semibold tabular-nums">{hudMetrics.velocityKmS} km/s</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-neutral-400">Dynamic Pressure (q)</span>
            <span className="text-amber-400 font-semibold tabular-nums">{hudMetrics.dynamicPressureKPa} kPa</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-neutral-400">Shock Layer Temp</span>
            <span className="text-orange-400 font-semibold tabular-nums">{hudMetrics.shockTempK.toLocaleString()} K</span>
          </div>
        </div>
      </div>

      {/* Top Right: Camera Mode Switcher */}
      <div className="absolute top-3 right-3 font-mono text-[10px] pointer-events-auto flex flex-col gap-1.5 items-end z-10">
        <div className="flex items-center gap-1 bg-[#0e1015]/90 backdrop-blur-sm border border-[#1e222b] p-1 rounded-[2px]">
          <button
            onClick={() => {
              setCameraMode('orbital');
              if (controlsRef.current && cameraRef.current) {
                cameraRef.current.position.set(0, 18, 32);
                controlsRef.current.target.set(0, 0, 0);
              }
            }}
            className={`px-2 py-1 rounded-[1px] transition-colors ${
              cameraMode === 'orbital' ? 'bg-[#00d8e6] text-[#090a0d] font-semibold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Orbital Look
          </button>
          <button
            onClick={() => setCameraMode('chase')}
            className={`px-2 py-1 rounded-[1px] transition-colors ${
              cameraMode === 'chase' ? 'bg-[#00d8e6] text-[#090a0d] font-semibold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Chase Impactor
          </button>
          <button
            onClick={() => setCameraMode('ground')}
            className={`px-2 py-1 rounded-[1px] transition-colors ${
              cameraMode === 'ground' ? 'bg-[#00d8e6] text-[#090a0d] font-semibold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Ground Zero
          </button>
        </div>
      </div>

      {/* Bottom Floating: Interactive Trajectory Playback & Timeline Scrubber Bar */}
      <div className="absolute bottom-4 left-4 right-4 max-w-2xl mx-auto pointer-events-auto z-10 font-mono">
        <div className="border border-[#1e222b] bg-[#0e1015]/95 backdrop-blur-sm p-3 rounded-[2px] shadow-xl flex flex-col gap-2.5">
          {/* Top Row: Playback Controls & Speed Multipliers */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  soundEffects.click();
                  setIsPlaying(!isPlaying);
                }}
                className={`telemetry-btn h-7 px-3 text-xs ${isPlaying ? 'telemetry-btn-secondary' : 'telemetry-btn-primary'}`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play Descent'}</span>
              </button>

              <button
                onClick={() => {
                  soundEffects.click();
                  setTimelineProgress((prev) => {
                    const next = Math.max(0, prev - 0.05);
                    applyTimelineProgress(next);
                    return next;
                  });
                }}
                title="Step Backward"
                className="w-7 h-7 flex items-center justify-center bg-[#14171e] border border-[#1e222b] text-neutral-300 hover:text-[#00d8e6] rounded-[1px]"
              >
                <SkipBack className="w-3 h-3" />
              </button>

              <button
                onClick={() => {
                  soundEffects.click();
                  setTimelineProgress((prev) => {
                    const next = Math.min(1, prev + 0.05);
                    applyTimelineProgress(next);
                    return next;
                  });
                }}
                title="Step Forward"
                className="w-7 h-7 flex items-center justify-center bg-[#14171e] border border-[#1e222b] text-neutral-300 hover:text-[#00d8e6] rounded-[1px]"
              >
                <SkipForward className="w-3 h-3" />
              </button>

              <button
                onClick={() => {
                  soundEffects.click();
                  handleReset();
                }}
                title="Reset Trajectory"
                className="w-7 h-7 flex items-center justify-center bg-[#14171e] border border-[#1e222b] text-neutral-300 hover:text-amber-400 rounded-[1px]"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Playback Speed Multipliers */}
            <div className="flex items-center gap-1 bg-[#14171e] border border-[#1e222b] p-0.5 rounded-[1px] text-[10px]">
              {[0.5, 1.0, 2.0, 5.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSpeedMultiplier(spd)}
                  className={`px-1.5 py-0.5 rounded-[1px] ${
                    speedMultiplier === spd ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Row: Scrubber Slider */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-neutral-400 min-w-[50px] uppercase">
              Approach
            </span>
            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.002"
                value={timelineProgress}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTimelineProgress(val);
                  applyTimelineProgress(val);
                }}
                className="terminal-range-slider slider-teal w-full"
              />
            </div>
            <span className="text-[10px] font-semibold text-neutral-200 min-w-[55px] text-right tabular-nums">
              {(timelineProgress * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
