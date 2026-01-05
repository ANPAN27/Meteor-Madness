🌍 Asteroid Impact Simulator — World Map & 3D Visualization

An interactive asteroid impact simulation platform that combines a global map-based impact analysis with a real-time 3D physics-based trajectory simulation.
Users can input asteroid parameters to visualize impact zones, energy release, affected countries, mitigation strategies, and a realistic 3D collision scenario with Earth.

🚀 Features
🗺️ World Map Impact Analysis

Interactive Leaflet world map

Highlights countries affected by impact zones

Visualizes:

🔴 Critical zone

🟡 Moderate damage zone

🟢 Safe regions

Animated asteroid trajectory path

Automatic map zoom & focus on impact location

📊 Impact Calculations

Estimated:

Crater diameter

Impact energy (Megatons of TNT)

Seismic magnitude

Dynamic energy distribution chart using Chart.js

Atmospheric loss vs impact energy visualization

🛡️ Consequences & Mitigation Engine

Intelligent threat-level classification:

Low

Moderate

High

Severe / Catastrophic

Region-aware mitigation strategies:

Tsunami risk

Urban evacuation

Climate effects

Technology suggestions:

Ground monitoring

Kinetic impactors

Nuclear deflection (for extreme events)

🌌 3D Asteroid Simulation (Three.js)

Real-time 3D asteroid trajectory

Physics-based gravitational interaction with Earth

Adjustable parameters:

Velocity

Mass

Diameter

Approach angle

Initial distance

Visual effects:

Impact crater

Explosion particles

Earth shake effect

Asteroid trail

Impact classification:

Airburst

City destroyer

Civilization threat

Extinction-level event

🧠 Technologies Used
Technology	Purpose
-HTML5 / CSS3	Structure & styling
-JavaScript (Vanilla)	Core logic
-Leaflet.js	Interactive world map
-Turf.js	Geospatial calculations
-Chart.js	Energy visualization
-Three.js	3D simulation & rendering
-OrbitControls	Camera interaction
-OpenStreetMap	Map tiles

📁 Project Structure
.
├── index.html        # Main application (HTML, CSS, JS)
├── README.md         # Project documentation


⚠️ This project is fully client-side and does not require a backend.

🧪 How It Works
1️⃣ World Map Simulation

Enter:

Asteroid diameter (meters)

Velocity (m/s)

Latitude & longitude of impact

Click Calculate Impact

The system:

Calculates impact energy

Draws damage zones

Highlights affected countries

Displays mitigation strategies

2️⃣ 3D Simulation

Switch to 3D Simulation View

Adjust sliders or input fields

Click Run 3D Simulation

Watch:

Asteroid trajectory

Earth collision

Impact effects

Damage classification

🧮 Scientific Model (Simplified)

Uses Newtonian gravity

Energy calculation:

E = ½mv²


Converted into:

Megatons of TNT

Hiroshima bomb equivalents

Crater and damage scaling based on real-world impact references:

Chelyabinsk

Tunguska

Chicxulub

⚠️ This simulator is educational, not a replacement for real NASA/ESA models.

🖥️ How to Run Locally
Option 1: Direct Open
Open index.html in any modern browser

Option 2: Local Server (Recommended)
# Using VS Code Live Server
# OR
python -m http.server


Then open:

http://localhost:8000

🌐 Browser Compatibility

✔ Chrome (Recommended)
✔ Edge
✔ Firefox
⚠ Safari (WebGL performance may vary)

🔮 Future Improvements

Real NASA NEO API integration

Real-time population impact estimation

Climate & atmospheric simulation

Multiplayer / scenario sharing

Backend-based physics refinement

Mobile optimization

📜 License

This project is open-source and free to use for:

Educational purposes

Hackathons

Research demos

⭐ Acknowledgements

OpenStreetMap contributors

Three.js community

Scientific references from NASA & ESA public resources
