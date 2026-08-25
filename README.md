# Meteor Madness — Asteroid Impact Simulator

An interactive, fully client-side asteroid impact simulator built for the **NASA Space Apps Challenge 2025**. It combines a 2D world map-based impact analysis with a real-time 3D physics trajectory simulation, all in a single HTML file.

Users input asteroid parameters to visualize impact zones, energy release, affected countries, mitigation strategies, and a realistic 3D collision scenario with Earth.

## Features

### World Map Impact Analysis
- Interactive Leaflet world map with OpenStreetMap tiles
- Highlights countries by damage severity (Critical / Moderate / Safe)
- Animated asteroid trajectory path with auto-zoom to impact site
- Turf.js-powered geospatial intersection for country-level damage assessment

### Impact Calculations
- Estimated crater diameter, impact energy (Megatons of TNT), and seismic magnitude
- Dynamic doughnut chart (Chart.js) for energy vs. atmospheric loss visualization

### Consequences & Mitigation Engine
- Threat-level classification: Low, Moderate, High, Severe/Catastrophic
- Region-aware mitigation strategies (tsunami risk, urban evacuation, climate effects)
- Technology recommendations scaled to threat level (ground monitoring, kinetic impactors, nuclear deflection)

### 3D Asteroid Simulation (Three.js)
- Real-time 3D trajectory with Newtonian gravitational physics
- Configurable parameters: velocity, mass, diameter, approach angle, initial distance
- Visual effects: impact crater, explosion particles, Earth shake, asteroid trail, orbiting moon
- Impact classification: Airburst, City Destroyer, Civilization Threat, Extinction-Level Event
- Interactive camera controls (OrbitControls — drag to orbit, scroll to zoom)

## Technologies

| Technology | Purpose |
|---|---|
| HTML5 / CSS3 | Structure, styling, responsive layout |
| JavaScript (Vanilla) | Core logic, physics simulation |
| Leaflet.js | Interactive world map |
| Turf.js | Geospatial calculations (country intersection) |
| Chart.js | Energy distribution visualization |
| Three.js + OrbitControls | 3D simulation and rendering |
| OpenStreetMap | Map tiles |

All libraries are loaded via CDN — no build step required.

## Project Structure

```
.
├── index.html        # Single-file application (HTML + CSS + JS)
└── README.md         # This file
```

This project is fully client-side with no backend, no build tools, and no package dependencies.

## How to Run

**Option 1: Direct open** — open `index.html` in any modern browser.

**Option 2: Local server (recommended)**
```bash
python -m http.server
# or use VS Code Live Server
```
Then visit `http://localhost:8000`.

## How It Works

### Map View
1. Enter asteroid diameter, velocity, and impact coordinates
2. Click **Calculate Impact**
3. The system calculates energy, draws damage zones on the map, highlights affected countries, and displays mitigation strategies

### 3D Simulation
1. Switch to the **3D Simulation View** tab
2. Adjust sliders for velocity, mass, diameter, approach angle, and distance
3. Click **Run 3D Simulation**
4. Watch the asteroid trajectory, Earth collision, impact effects, and damage classification

## Scientific Model

Uses simplified Newtonian gravity for trajectory calculation. Impact energy uses `E = 0.5 * m * v^2`, converted to Megatons of TNT and Hiroshima bomb equivalents. Crater and damage scaling are based on real-world reference events (Chelyabinsk, Tunguska, Chicxulub).

> This simulator is educational — not a replacement for real NASA/ESA models.

## Browser Compatibility

- Chrome (recommended)
- Edge
- Firefox
- Safari (WebGL performance may vary)

## Future Improvements

- Real NASA NEO API integration
- Real-time population impact estimation
- Climate & atmospheric simulation
- Multiplayer / scenario sharing
- Backend-based physics refinement
- Mobile optimization

## License

Open-source, free to use for educational purposes, hackathons, and research demos.

## Acknowledgements

- OpenStreetMap contributors
- Three.js community
- Scientific references from NASA & ESA public resources
