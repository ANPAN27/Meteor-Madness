import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FlightParameters3D } from '../types';
import { soundEffects } from '../utils/audio';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
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

const TRAJECTORY_STEPS = 100;
const EARTH_RADIUS_UNITS = 6.0;
const KM_TO_UNITS = EARTH_RADIUS_UNITS / 6371.0;
const MILESTONE_ALTITUDES = [1000, 100, 50, 0];

// Pre-allocated temp vectors to avoid GC pressure
const _tempVec = new THREE.Vector3();
const _tempVec2 = new THREE.Vector3();
const _tempVec3 = new THREE.Vector3();

function latLonToVector3(lat: number, lon: number, altitudeKm: number, out: THREE.Vector3): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const radius = EARTH_RADIUS_UNITS + altitudeKm * KM_TO_UNITS;
  out.x = -(radius * Math.sin(phi) * Math.cos(theta));
  out.z = radius * Math.sin(phi) * Math.sin(theta);
  out.y = radius * Math.cos(phi);
  return out;
}

function computeTrajectory(flightParams: FlightParameters3D, targetCoords: { lat: number; lon: number }): TrajectoryPoint[] {
  const lat = targetCoords.lat;
  const lon = targetCoords.lon;
  const angleDeg = Math.min(90, Math.max(10, flightParams.angle));
  const angleRad = (angleDeg * Math.PI) / 180;
  const baseVelocity = flightParams.velocity;
  const totalDistanceKm = flightParams.distance * 1000;

  const targetPos = latLonToVector3(lat, lon, 0, _tempVec);
  const surfaceNormal = targetPos.clone().normalize();

  const up = _tempVec2.set(0, 1, 0);
  let tangent = _tempVec3.crossVectors(surfaceNormal, up).normalize();
  if (tangent.lengthSq() < 0.001) {
    tangent = _tempVec3.crossVectors(surfaceNormal, _tempVec2.set(1, 0, 0)).normalize();
  }

  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const approachDir = tangent.clone().multiplyScalar(cosA).add(surfaceNormal.clone().multiplyScalar(sinA)).normalize();

  const points: TrajectoryPoint[] = [];

  for (let i = 0; i <= TRAJECTORY_STEPS; i++) {
    const fraction = i / TRAJECTORY_STEPS;
    const altitudeKm = totalDistanceKm * Math.pow(1 - fraction, 1.8);

    const gravFactor = Math.sqrt(1 + (EARTH_RADIUS_UNITS / (EARTH_RADIUS_UNITS + altitudeKm * KM_TO_UNITS)) * 0.45);
    const currentVelocity = baseVelocity * gravFactor;

    const radialPos = latLonToVector3(lat, lon, altitudeKm, new THREE.Vector3());
    const horizontalOffsetDist = (altitudeKm / Math.tan(Math.max(0.15, angleRad))) * KM_TO_UNITS;
    const finalPos = radialPos.add(approachDir.clone().multiplyScalar(horizontalOffsetDist * (1 - fraction)));

    let phase: TrajectoryPoint['phase'] = 'deep_space';
    if (altitudeKm <= 0.5) phase = 'terminal_impact';
    else if (altitudeKm <= 60) phase = 'plasma_sheath';
    else if (altitudeKm <= 120) phase = 'entry_interface';
    else if (altitudeKm <= 1000) phase = 'exosphere';

    points.push({
      position: fraction === 1 ? targetPos.clone() : finalPos,
      altitudeKm: Math.round(altitudeKm),
      velocityKmS: Number(currentVelocity.toFixed(2)),
      timeSec: Number((altitudeKm / Math.max(1, currentVelocity)).toFixed(1)),
      phase
    });
  }

  return points;
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

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const trailLineRef = useRef<THREE.Line | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const impactGroupRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const trajectoryDataRef = useRef<TrajectoryPoint[]>([]);

  // Playback state driven entirely by refs (no React state re-renders during playback)
  const timelineRef = useRef(0);
  const isPlayingRef = useRef(false);
  const speedRef = useRef(1.0);
  const simStateRef = useRef<'idle' | 'running' | 'impacted'>('idle');
  const flightParamsRef = useRef(flightParams);
  const onSimResultsUpdateRef = useRef(onSimResultsUpdate);
  const targetCoordsRef = useRef(targetCoords);

  // React state only for UI controls (not hot-path)
  const [isPlayingUI, setIsPlayingUI] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [cameraMode, setCameraMode] = useState<'orbital' | 'chase' | 'ground'>('orbital');
  const cameraModeRef = useRef<'orbital' | 'chase' | 'ground'>('orbital');

  // HUD state - updated via refs + direct DOM for zero React overhead during playback
  const hudRef = useRef<HTMLDivElement>(null);
  const hudValuesRef = useRef({ altKm: 0, velocityKmS: 0, dynamicPressureKPa: 0, shockTempK: 0, timeToImpactSec: 0, phaseName: '' });

  useEffect(() => { flightParamsRef.current = flightParams; }, [flightParams]);
  useEffect(() => { targetCoordsRef.current = targetCoords; }, [targetCoords]);
  useEffect(() => { onSimResultsUpdateRef.current = onSimResultsUpdate; }, [onSimResultsUpdate]);
  useEffect(() => { cameraModeRef.current = cameraMode; }, [cameraMode]);

  // Update HUD DOM directly without React state
  const updateHUDDirect = useCallback((alt: number, vel: number, dp: number, st: number, tti: number, phase: string) => {
    const h = hudRef.current;
    if (!h) return;
    const els = h.querySelectorAll<HTMLElement>('[data-hud]');
    for (const el of els) {
      const key = el.dataset.hud;
      if (key === 'phase') el.textContent = phase;
      else if (key === 'tti') el.textContent = tti > 0 ? `T- ${tti}s` : 'T- 0.0s';
      else if (key === 'alt') el.textContent = Math.round(alt).toLocaleString() + ' km';
      else if (key === 'vel') el.textContent = vel + ' km/s';
      else if (key === 'dp') el.textContent = dp + ' kPa';
      else if (key === 'st') el.textContent = Math.round(st).toLocaleString() + ' K';
    }
  }, []);

  // Apply timeline position - mutates Three.js objects directly, no allocations in hot path
  const applyTimelineProgress = useCallback((progress: number) => {
    const points = trajectoryDataRef.current;
    if (points.length === 0) return;

    const clamped = progress < 0 ? 0 : progress > 1 ? 1 : progress;
    const index = Math.min(points.length - 1, (clamped * (points.length - 1)) | 0);
    const currentPoint = points[index];

    const asteroidMesh = asteroidRef.current;
    if (asteroidMesh) {
      asteroidMesh.position.copy(currentPoint.position);
      asteroidMesh.rotation.x = clamped * 20;
      asteroidMesh.rotation.y = clamped * 35;

      const fp = flightParamsRef.current;
      const scale = fp.diameter * 0.4;
      const clampedScale = scale < 0.3 ? 0.3 : scale > 2.5 ? 2.5 : scale;
      asteroidMesh.scale.set(clampedScale, clampedScale, clampedScale);

      // Plasma glow
      const plasma = asteroidMesh.children[0] as THREE.Mesh;
      if (plasma && plasma.material instanceof THREE.MeshBasicMaterial) {
        if (currentPoint.altitudeKm <= 100 && currentPoint.altitudeKm > 0) {
          const intensity = 1 - currentPoint.altitudeKm / 100;
          plasma.material.opacity = intensity * 0.85;
          const s = 1 + intensity * 0.5;
          plasma.scale.set(s, s, s);
        } else {
          plasma.material.opacity = 0;
        }
      }
    }

    // Update trail line - reuse geometry, just update draw range
    const trail = trailLineRef.current;
    if (trail && trail.geometry) {
      const posAttr = trail.geometry.getAttribute('position') as THREE.BufferAttribute;
      const count = index + 1;
      for (let i = 0; i < count && i < points.length; i++) {
        posAttr.setXYZ(i, points[i].position.x, points[i].position.y, points[i].position.z);
      }
      posAttr.needsUpdate = true;
      trail.geometry.setDrawRange(0, count);
    }

    // HUD metrics (throttled by the caller)
    const dynPressure = currentPoint.altitudeKm < 100
      ? (0.5 * 1.225 * Math.exp(-currentPoint.altitudeKm / 7.5) * (currentPoint.velocityKmS * 1000) ** 2 / 1000)
      : 0;

    const shockTemp = currentPoint.altitudeKm < 120
      ? Math.min(18000, 280 + currentPoint.velocityKmS ** 2 * 12 * Math.exp(-currentPoint.altitudeKm / 20))
      : 280;

    let phaseName = 'Deep Space Approach';
    if (currentPoint.phase === 'terminal_impact') phaseName = 'TERMINAL IMPACT // GROUND ZERO';
    else if (currentPoint.phase === 'plasma_sheath') phaseName = 'HYPERSONIC PLASMA IONIZATION SHEATH';
    else if (currentPoint.phase === 'entry_interface') phaseName = 'ATMOSPHERIC ENTRY INTERFACE (~100 KM)';
    else if (currentPoint.phase === 'exosphere') phaseName = 'EXOSPHERE / LEO TRANSIT';

    updateHUDDirect(
      currentPoint.altitudeKm,
      currentPoint.velocityKmS,
      Number(dynPressure.toFixed(1)),
      shockTemp,
      currentPoint.timeSec,
      phaseName
    );

    // Camera tracking
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    const cm = cameraModeRef.current;
    if (cam && ctrl) {
      if (cm === 'chase' && asteroidMesh) {
        cam.position.copy(currentPoint.position).add(_tempVec3.set(3, 2, 4));
        ctrl.target.copy(currentPoint.position);
      } else if (cm === 'ground') {
        const targetPos = points[points.length - 1].position;
        cam.position.copy(targetPos).multiplyScalar(1.08).add(_tempVec3.set(0.5, 0.5, 0.5));
        ctrl.target.copy(currentPoint.position);
      }
    }

    // Impact trigger
    if (clamped >= 0.99 && simStateRef.current !== 'impacted') {
      triggerImpactFX(points[points.length - 1].position);
    }
  }, [updateHUDDirect]);

  const triggerImpactFX = useCallback((impactPos: THREE.Vector3) => {
    simStateRef.current = 'impacted';
    soundEffects.impactRumble();

    const group = impactGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat.dispose();
      }
    }

    const craterMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 24),
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    craterMesh.position.copy(impactPos).multiplyScalar(1.002);
    craterMesh.lookAt(impactPos.clone().multiplyScalar(2));
    group.add(craterMesh);

    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.4, 32),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    ringMesh.position.copy(craterMesh.position);
    ringMesh.rotation.copy(craterMesh.rotation);
    group.add(ringMesh);

    const fp = flightParamsRef.current;
    const energyMT = 0.5 * fp.mass * 1e12 * (fp.velocity * 1000) ** 2 / 4.184e15;

    onSimResultsUpdateRef.current({
      impact: true,
      energyMT,
      classification: energyMT > 10000 ? 'Class IV' : 'Class III',
      description: 'Atmospheric penetration with ground coupling',
      craterKm: fp.diameter * 2.2,
      location: `[${targetCoordsRef.current.lat.toFixed(2)}°, ${targetCoordsRef.current.lon.toFixed(2)}°]`
    });
  }, []);

  // Setup Three.js scene
  const sceneRef = useRef<THREE.Scene | null>(null);
  const asteroidRef = useRef<THREE.Mesh | null>(null);

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

    scene.add(new THREE.AmbientLight(0x334455, 0.7));
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    sunLight.position.set(120, 60, 90);
    scene.add(sunLight);

    const gridHelper = new THREE.GridHelper(200, 80, 0x0a2a3a, 0x0a1520);
    gridHelper.position.y = -EARTH_RADIUS_UNITS - 4;
    gridHelper.material.opacity = 0.25;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Earth - reduced segment count
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS_UNITS, 48, 48);
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0x1a3a5c,
      emissive: 0x050a12,
      specular: 0x333333,
      shininess: 15
    });
    const textureLoader = new THREE.TextureLoader();
    const tryLoadTexture = (urls: string[]) => {
      if (urls.length === 0) {
        // All failed - create a procedural earth-like appearance
        earthMat.color.setHex(0x1a3a5c);
        earthMat.wireframe = false;
        earthMat.needsUpdate = true;
        return;
      }
      textureLoader.load(
        urls[0],
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          earthMat.map = tex;
          earthMat.needsUpdate = true;
        },
        undefined,
        () => tryLoadTexture(urls.slice(1))
      );
    };
    tryLoadTexture([
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
      'https://unpkg.com/three/examples/textures/planets/earth_atmos_2048.jpg',
    ]);
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // Atmosphere glow shell
    const atmGeo = new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 1.015, 48, 48);
    const atmMat = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // Outer atmosphere halo
    const haloGeo = new THREE.SphereGeometry(EARTH_RADIUS_UNITS * 1.06, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x1a8fff,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(haloGeo, haloMat));

    // Asteroid
    const asteroidGeo = new THREE.IcosahedronGeometry(0.35, 1);
    const asteroidMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.8, metalness: 0.2 });
    const asteroidMesh = new THREE.Mesh(asteroidGeo, asteroidMat);
    asteroidRef.current = asteroidMesh;
    scene.add(asteroidMesh);

    // Plasma glow
    const plasmaGeo = new THREE.SphereGeometry(0.6, 12, 12);
    const plasmaMat = new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0, wireframe: true });
    asteroidMesh.add(new THREE.Mesh(plasmaGeo, plasmaMat));

    // Trajectory line (full path, static)
    const trajGeo = new THREE.BufferGeometry();
    trajGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((TRAJECTORY_STEPS + 1) * 3), 3));
    const trajLine = new THREE.Line(trajGeo, new THREE.LineBasicMaterial({ color: 0x2a303d }));
    trajectoryLineRef.current = trajLine;
    scene.add(trajLine);

    // Trail line (dynamic, pre-allocated buffer)
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((TRAJECTORY_STEPS + 1) * 3), 3));
    const trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0x00d8e6, transparent: true, opacity: 0.9 }));
    trailLineRef.current = trailLine;
    scene.add(trailLine);

    const markersGroup = new THREE.Group();
    markersGroupRef.current = markersGroup;
    scene.add(markersGroup);

    const impactGroup = new THREE.Group();
    impactGroupRef.current = impactGroup;
    scene.add(impactGroup);

    // Render loop - only render when needed
    let needsRender = true;
    const controlsEventHandler = () => { needsRender = true; };
    controls.addEventListener('change', controlsEventHandler);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      // Only render when camera moved or playing
      if (needsRender || isPlayingRef.current) {
        renderer.render(scene, camera);
        needsRender = false;
      }
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      needsRender = true;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('change', controlsEventHandler);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
    };
  }, []);

  // Re-compute trajectory data when params change (but don't draw anything yet)
  useEffect(() => {
    const trajectory = computeTrajectory(flightParams, targetCoords);
    trajectoryDataRef.current = trajectory;

    // Hide everything until user presses play
    const trajLine = trajectoryLineRef.current;
    if (trajLine) trajLine.geometry.setDrawRange(0, 0);
    const trail = trailLineRef.current;
    if (trail) trail.geometry.setDrawRange(0, 0);

    const markersGroup = markersGroupRef.current;
    if (markersGroup) {
      while (markersGroup.children.length > 0) {
        const child = markersGroup.children[0];
        markersGroup.remove(child);
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat.dispose();
        }
      }
    }
  }, [flightParams, targetCoords]);

  // Draw trajectory visuals only when playing or after first play
  const drawTrajectoryVisuals = useCallback(() => {
    const trajectory = trajectoryDataRef.current;
    if (trajectory.length === 0) return;

    // Draw full trajectory line
    const trajLine = trajectoryLineRef.current;
    if (trajLine) {
      const posAttr = trajLine.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < trajectory.length; i++) {
        const p = trajectory[i].position;
        posAttr.setXYZ(i, p.x, p.y, p.z);
      }
      posAttr.needsUpdate = true;
      trajLine.geometry.setDrawRange(0, trajectory.length);
    }

    // Build milestone markers
    const markersGroup = markersGroupRef.current;
    if (markersGroup) {
      while (markersGroup.children.length > 0) {
        const child = markersGroup.children[0];
        markersGroup.remove(child);
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat.dispose();
        }
      }
      for (const targetAlt of MILESTONE_ALTITUDES) {
        let closest = trajectory[0];
        let minDiff = Infinity;
        for (const p of trajectory) {
          const diff = Math.abs(p.altitudeKm - targetAlt);
          if (diff < minDiff) { minDiff = diff; closest = p; }
        }
        if (closest) {
          const color = targetAlt === 0 ? 0xef4444 : targetAlt <= 50 ? 0xf59e0b : 0x00d8e6;
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.4, 0.5, 16),
            new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
          );
          ring.position.copy(closest.position);
          ring.lookAt(0, 0, 0);
          markersGroup.add(ring);
        }
      }
    }
  }, []);

  // Playback - driven by requestAnimationFrame, not setInterval
  useEffect(() => {
    if (!isPlayingRef.current) return;

    let lastTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      if (!isPlayingRef.current) return;

      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const increment = 0.08 * speedRef.current * dt;
      let next = timelineRef.current + increment;

      if (next >= 1.0) {
        next = 1.0;
        isPlayingRef.current = false;
        setIsPlayingUI(false);
        applyTimelineProgress(1.0);
        // Sync timeline slider
        const slider = document.querySelector<HTMLInputElement>('.timeline-slider');
        if (slider) slider.value = '1';
        return;
      }

      timelineRef.current = next;
      applyTimelineProgress(next);

      // Sync timeline slider
      const slider = document.querySelector<HTMLInputElement>('.timeline-slider');
      if (slider) slider.value = String(next);

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlayingUI, applyTimelineProgress]);

  // Handle run trigger
  const runCountRef = useRef(0);
  useEffect(() => {
    if (runSimTrigger > 0 && runSimTrigger !== runCountRef.current) {
      runCountRef.current = runSimTrigger;
      drawTrajectoryVisuals();
      timelineRef.current = 0;
      simStateRef.current = 'running';
      isPlayingRef.current = true;
      setIsPlayingUI(true);
      const slider = document.querySelector<HTMLInputElement>('.timeline-slider');
      if (slider) slider.value = '0';
    }
  }, [runSimTrigger, drawTrajectoryVisuals]);

  const handleReset = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlayingUI(false);
    timelineRef.current = 0;
    simStateRef.current = 'idle';
    applyTimelineProgress(0);

    const group = impactGroupRef.current;
    if (group) {
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat.dispose();
      }
      }
    }

    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(0, 18, 32);
      controlsRef.current.target.set(0, 0, 0);
    }

    const slider = document.querySelector<HTMLInputElement>('.timeline-slider');
    if (slider) slider.value = '0';

    onSimResultsUpdateRef.current(null);
  }, [applyTimelineProgress]);

  const resetCountRef = useRef(0);
  useEffect(() => {
    if (resetSimTrigger > 0 && resetSimTrigger !== resetCountRef.current) {
      resetCountRef.current = resetSimTrigger;
      handleReset();
    }
  }, [resetSimTrigger, handleReset]);

  const handlePlayPause = useCallback(() => {
    soundEffects.click();
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlayingUI(false);
    } else {
      drawTrajectoryVisuals();
      if (timelineRef.current >= 1) {
        timelineRef.current = 0;
        applyTimelineProgress(0);
      }
      simStateRef.current = 'running';
      isPlayingRef.current = true;
      setIsPlayingUI(true);
    }
  }, [applyTimelineProgress, drawTrajectoryVisuals]);

  const handleStep = useCallback((dir: number) => {
    soundEffects.click();
    const next = Math.max(0, Math.min(1, timelineRef.current + dir * 0.05));
    timelineRef.current = next;
    applyTimelineProgress(next);
    const slider = document.querySelector<HTMLInputElement>('.timeline-slider');
    if (slider) slider.value = String(next);
  }, [applyTimelineProgress]);

  const handleSpeedChange = useCallback((spd: number) => {
    setSpeedMultiplier(spd);
    speedRef.current = spd;
  }, []);

  const handleSliderChange = useCallback((val: number) => {
    timelineRef.current = val;
    applyTimelineProgress(val);
  }, [applyTimelineProgress]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#050505] overflow-hidden select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Top Left: HUD Telemetry - uses direct DOM updates during playback */}
      <div ref={hudRef} className="absolute top-3 left-3 font-mono text-[10px] text-neutral-300 pointer-events-none flex flex-col gap-1.5 z-10">
        <div className="border border-[#1e222b] bg-[#0e1015]/90 backdrop-blur-sm px-3 py-2 rounded-[2px] pointer-events-auto flex flex-col gap-1 shadow">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isPlayingUI ? 'bg-amber-400 animate-pulse' : 'bg-[#00d8e6]'}`}></span>
            <span className="font-semibold text-neutral-200 uppercase tracking-wider" data-hud="phase">
              Deep Space Approach
            </span>
          </div>
          <div className="text-neutral-400 text-[9px] flex items-center gap-2">
            <span>Target: [{targetCoords.lat.toFixed(2)}°, {targetCoords.lon.toFixed(2)}°]</span>
            <span>&middot;</span>
            <span>Angle: {flightParams.angle}°</span>
          </div>
        </div>

        <div className="border border-[#1e222b] bg-[#0e1015]/95 backdrop-blur-sm p-3 rounded-[2px] flex flex-col gap-1.5 pointer-events-auto shadow-md min-w-[220px]">
          <div className="text-neutral-400 text-[10px] uppercase border-b border-[#1e222b] pb-1 flex justify-between">
            <span>Descent Telemetry</span>
            <span className="text-amber-400 font-semibold tabular-nums" data-hud="tti">
              T- 60s
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-neutral-400">Altitude</span>
            <span className="text-neutral-200 font-semibold tabular-nums" data-hud="alt">0 km</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-neutral-400">Velocity</span>
            <span className="text-teal-400 font-semibold tabular-nums" data-hud="vel">0 km/s</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-neutral-400">Dynamic Pressure (q)</span>
            <span className="text-amber-400 font-semibold tabular-nums" data-hud="dp">0 kPa</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-neutral-400">Shock Layer Temp</span>
            <span className="text-orange-400 font-semibold tabular-nums" data-hud="st">280 K</span>
          </div>
        </div>
      </div>

      {/* Top Right: Camera Mode */}
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

      {/* Bottom: Playback Controls */}
      <div className="absolute bottom-4 left-4 right-4 max-w-2xl mx-auto pointer-events-auto z-10 font-mono">
        <div className="border border-[#1e222b] bg-[#0e1015]/95 backdrop-blur-sm p-3 rounded-[2px] shadow-xl flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePlayPause}
                className={`telemetry-btn h-7 px-3 text-xs ${isPlayingUI ? 'telemetry-btn-secondary' : 'telemetry-btn-primary'}`}
              >
                {isPlayingUI ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlayingUI ? 'Pause' : 'Play Descent'}</span>
              </button>
              <button onClick={() => handleStep(-1)} title="Step Backward" className="w-7 h-7 flex items-center justify-center bg-[#14171e] border border-[#1e222b] text-neutral-300 hover:text-[#00d8e6] rounded-[1px]">
                <SkipBack className="w-3 h-3" />
              </button>
              <button onClick={() => handleStep(1)} title="Step Forward" className="w-7 h-7 flex items-center justify-center bg-[#14171e] border border-[#1e222b] text-neutral-300 hover:text-[#00d8e6] rounded-[1px]">
                <SkipForward className="w-3 h-3" />
              </button>
              <button onClick={() => { soundEffects.click(); handleReset(); }} title="Reset" className="w-7 h-7 flex items-center justify-center bg-[#14171e] border border-[#1e222b] text-neutral-300 hover:text-amber-400 rounded-[1px]">
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-1 bg-[#14171e] border border-[#1e222b] p-0.5 rounded-[1px] text-[10px]">
              {[0.5, 1.0, 2.0, 5.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleSpeedChange(spd)}
                  className={`px-1.5 py-0.5 rounded-[1px] ${
                    speedMultiplier === spd ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-neutral-400 min-w-[50px] uppercase">Approach</span>
            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.002"
                defaultValue="0"
                onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                className="terminal-range-slider slider-teal w-full timeline-slider"
              />
            </div>
            <span className="text-[10px] font-semibold text-neutral-200 min-w-[55px] text-right tabular-nums">
              {(timelineRef.current * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
