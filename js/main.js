import { Projectile } from './engine.js';
import { Renderer } from './renderer.js';
import { Game } from './game.js';
import { GraphPlotter } from './graphs.js';

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const graphCanvas = document.getElementById('graphCanvas');
const btnFire = document.getElementById('btn-fire');
const btnReset = document.getElementById('btn-reset');
const btnChallenge = document.getElementById('btn-challenge-start');
const btnMobileControls = document.getElementById('btn-mobile-controls');
const btnCloseControls = document.getElementById('btn-close-controls');
const controlsPanel = document.getElementById('controls-panel');

// Inputs
const inpVelocity = document.getElementById('inp-velocity');
const inpAngle = document.getElementById('inp-angle');
const inpGravity = document.getElementById('inp-gravity');
const chkAirRes = document.getElementById('chk-air-resistance');
const selPlanet = document.getElementById('sel-planet');

// Displays
const dispVelocity = document.getElementById('disp-velocity');
const dispAngle = document.getElementById('disp-angle');
const dispGravity = document.getElementById('disp-gravity');
const dispZoom = document.getElementById('disp-zoom');

const valRange = document.getElementById('val-range');
const valHeight = document.getElementById('val-height');
const valTime = document.getElementById('val-time');

const challengeInfo = document.getElementById('challenge-info');
const scoreDisp = document.getElementById('score');
const targetDistDisp = document.getElementById('target-dist');

const inpZoom = document.getElementById('inp-zoom');
const btnZoomReset = document.getElementById('btn-zoom-reset');
const btnToggleHub = document.getElementById('btn-toggle-hub');
const hubContent = document.getElementById('hub-content');
const chkShowIdeal = document.getElementById('chk-show-ideal');
const chkKeepHistory = document.getElementById('chk-keep-history');
const chkShowVectors = document.getElementById('chk-show-vectors');
const chkAutoZoom = document.getElementById('chk-auto-zoom');

const valKE = document.getElementById('val-ke');
const valPE = document.getElementById('val-pe');
const valTE = document.getElementById('val-te');
const barKE = document.getElementById('bar-ke');
const barPE = document.getElementById('bar-pe');

const selPreset = document.getElementById('sel-preset');

// State
const renderer = new Renderer(canvas);
const plotter = new GraphPlotter(graphCanvas);
const game = new Game();

let projectile = null;
let idealProjectile = null; // ghost path
let historyTrajectories = [];

let animationId = null;
let isSimulating = false;
let lastTime = 0;

// Parameters
let velocity = 20;
let angle = 45;
let gravity = 9.81;
let airResistance = false;
let zoom = 1.0;
let showVectors = false;

// Init
function init() {
    updateDisplays();

    // Resize observers are handled in classes, but initial draw needed
    drawFrame();

    // Event Listeners
    inpVelocity.addEventListener('input', (e) => {
        velocity = parseFloat(e.target.value);
        dispVelocity.textContent = velocity;
    });

    inpAngle.addEventListener('input', (e) => {
        angle = parseFloat(e.target.value);
        dispAngle.textContent = angle;
    });

    inpGravity.addEventListener('input', (e) => {
        gravity = parseFloat(e.target.value);
        dispGravity.textContent = gravity;
    });

    chkAirRes.addEventListener('change', (e) => {
        airResistance = e.target.checked;
    });

    chkShowVectors.addEventListener('change', (e) => {
        showVectors = e.target.checked;
        drawFrame();
    });

    selPlanet.addEventListener('change', (e) => {
        gravity = parseFloat(e.target.value);
        inpGravity.value = gravity;
        dispGravity.textContent = gravity;
    });

    selPreset.addEventListener('change', (e) => loadPreset(e.target.value));

    inpZoom.addEventListener('input', (e) => {
        zoom = parseFloat(e.target.value);
        renderer.setZoom(zoom, true);
        dispZoom.textContent = Math.round(zoom * 100);

        // Disable auto-zoom if manually adjusted
        if (chkAutoZoom.checked) {
            chkAutoZoom.checked = false;
        }

        drawFrame();
    });

    btnZoomReset.addEventListener('click', () => {
        zoom = 1.0;
        inpZoom.value = 1.0;
        renderer.setZoom(1.0);
        dispZoom.textContent = "100";
        drawFrame();
    });

    btnToggleHub.addEventListener('click', () => {
        hubContent.classList.toggle('hidden');
        btnToggleHub.textContent = hubContent.classList.contains('hidden') ? "Expand" : "Collapse";
    });

    btnFire.addEventListener('click', () => {
        fireProjectile();
        // Auto-close panel on mobile when firing to show simulation
        if (window.innerWidth < 1024) {
            controlsPanel.classList.add('translate-x-full');
        }
    });

    btnReset.addEventListener('click', resetSimulation);
    btnChallenge.addEventListener('click', startChallenge);

    btnMobileControls.addEventListener('click', () => {
        controlsPanel.classList.remove('translate-x-full');
    });

    btnCloseControls.addEventListener('click', () => {
        controlsPanel.classList.add('translate-x-full');
    });

    // Make drawFrame accessible to resize observers
    window.drawFrame = drawFrame;

    // Initial render
    renderer.drawGrid();
}

function updateDisplays() {
    dispVelocity.textContent = velocity;
    dispAngle.textContent = angle;
    dispGravity.textContent = gravity;
}

function startChallenge() {
    game.startChallenge();
    challengeInfo.classList.remove('hidden');
    scoreDisp.textContent = game.score;
    targetDistDisp.textContent = game.targetDist + "m";
    resetSimulation();
}

function fireProjectile() {
    if (isSimulating) return;

    // History management
    if (!chkKeepHistory.checked) {
        historyTrajectories = [];
    } else if (projectile) {
        // Save previous path to history
        historyTrajectories.push(projectile.path);
        if (historyTrajectories.length > 5) historyTrajectories.shift();
    }

    projectile = new Projectile(0, 0, velocity, angle);

    // Ideal projectile (no air resistance)
    if (chkShowIdeal.checked && airResistance) {
        idealProjectile = new Projectile(0, 0, velocity, angle);
        idealProjectile.useWasm = false; // Force JS for comparison to avoid WASM sync issues
        idealProjectile.isIdeal = true;
    } else {
        idealProjectile = null;
    }

    isSimulating = true;
    game.lastHeight = 0;

    // Clear graphs
    plotter.resetPan();
    plotter.draw([]);

    loop();
}

function resetSimulation() {
    cancelAnimationFrame(animationId);
    isSimulating = false;
    projectile = null;
    idealProjectile = null;
    historyTrajectories = [];
    renderer.clear();
    renderer.drawGrid();
    plotter.resetPan();

    // Reset zoom gracefully if auto-zoom was on
    if (chkAutoZoom.checked) {
        renderer.setZoom(1.0);
    } else {
        renderer.setZoom(zoom, true);
    }

    if (game.isActive) {
        renderer.drawTarget(game.targetDist, game.targetWidth);
    }

    valRange.textContent = "0.00";
    valHeight.textContent = "0.00";
    valTime.textContent = "0.00";
}

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    const cleanDt = Math.min(dt, 0.05);

    // Update zoom animation
    const zoomChanged = renderer.updateZoom(cleanDt);
    if (zoomChanged) {
        // Sync zoom slider for visual feedback
        inpZoom.value = renderer.targetZoom;
        dispZoom.textContent = Math.round(renderer.zoom * 100);
    }

    if (isSimulating && projectile) {
        const steps = 5;
        const subDt = cleanDt / steps;

        for (let i = 0; i < steps; i++) {
            projectile.update(subDt, gravity, airResistance);

            // Update ideal ghost if enabled
            if (idealProjectile) {
                idealProjectile.update(subDt, gravity, false);
            }

            const collision = game.checkCollision(projectile);

            if (collision.ground || projectile.y < -10 || projectile.x > 1000) {
                isSimulating = false;
                projectile.y = Math.max(0, projectile.y);

                valRange.textContent = projectile.x.toFixed(2);
                valHeight.textContent = game.lastHeight.toFixed(2);
                valTime.textContent = projectile.time.toFixed(2);

                if (game.isActive) {
                    game.updateScore(collision.hit);
                    scoreDisp.textContent = game.score;
                    if (collision.hit) {
                        valRange.style.color = '#22c55e';
                        setTimeout(() => valRange.style.color = '', 1000);
                        targetDistDisp.textContent = game.targetDist + "m";
                        startChallenge();
                    }
                }

                plotter.draw(projectile.path);
                // Don't cancel animation frame here, let it finish naturally
            }
        }

        // Analysis & Stats (Run once per frame)
        updateEnergyDisplay(projectile);

        if (projectile.y > game.lastHeight) {
            game.lastHeight = projectile.y;
            valHeight.textContent = game.lastHeight.toFixed(2);
        }

        // Smart Auto-Zoom Calculation (Run once per frame)
        if (chkAutoZoom.checked) {
            // Use incrementally updated bbox for efficiency
            let { maxX, maxY } = projectile.bbox;

            // Proactive Lookahead: Consider current velocity
            const lookaheadTime = 1.0; // 1 second ahead
            const futureX = projectile.x + projectile.vx * lookaheadTime;
            const futureY = projectile.y + projectile.vy * lookaheadTime;

            maxX = Math.max(maxX, projectile.x, futureX);
            maxY = Math.max(maxY, projectile.y, futureY);

            // Include target in view
            if (game.isActive) {
                maxX = Math.max(maxX, game.targetDist + 10);
            }

            // Minimum bounds for small simulations
            maxX = Math.max(maxX, 40);
            maxY = Math.max(maxY, 15);

            // Calculate required zoom with aggressive padding for proactive feel
            const padding = 0.75;
            const zoomX = (renderer.canvas.width * padding - renderer.originX) / (maxX * renderer.baseScale);
            const zoomY = (renderer.canvas.height * padding) / (maxY * renderer.baseScale);

            const idealZoom = Math.min(zoomX, zoomY, 1.5);
            renderer.setZoom(idealZoom);
        }
    }

    drawFrame();

    if (isSimulating || zoomChanged) {
        animationId = requestAnimationFrame((t) => loop(t));
    } else {
        animationId = null;
        lastTime = 0;
    }
}

function updateEnergyDisplay(p) {
    // Energy per unit mass (J/kg)
    const v2 = p.vx * p.vx + p.vy * p.vy;
    const ke = 0.5 * v2;
    const pe = gravity * Math.max(0, p.y);
    const te = ke + pe;

    valKE.textContent = ke.toFixed(1);
    valPE.textContent = pe.toFixed(1);
    valTE.textContent = te.toFixed(1);

    // Dynamic bar scaling (assume max energy ref is initial KE + PE)
    if (!game.maxEnergy || !isSimulating) {
        game.maxEnergy = te || 100;
    }

    const kePct = Math.min(100, (ke / game.maxEnergy) * 100);
    const pePct = Math.min(100, (pe / game.maxEnergy) * 100);

    barKE.style.width = kePct + '%';
    barPE.style.width = pePct + '%';
}

function drawFrame() {
    renderer.clear();
    renderer.drawGrid();

    // Draw History
    historyTrajectories.forEach(path => {
        renderer.drawPath(path, '#334155', 1);
    });

    if (game.isActive) {
        renderer.drawTarget(game.targetDist, game.targetWidth);
    }

    if (idealProjectile) {
        renderer.drawPath(idealProjectile.path, 'rgba(234, 179, 8, 0.3)', 1, true);
    }

    if (projectile) {
        renderer.drawProjectile(projectile, showVectors);

        valRange.textContent = projectile.x.toFixed(2);
        valTime.textContent = projectile.time.toFixed(2);

        if (projectile.y > parseFloat(valHeight.textContent)) {
            valHeight.textContent = projectile.y.toFixed(2);
        }
    }
}

function loadPreset(preset) {
    if (!preset) return;

    resetSimulation();

    switch (preset) {
        case 'max-range':
            velocity = 30;
            angle = 45;
            airResistance = false;
            break;
        case 'moon-jump':
            velocity = 20;
            angle = 45;
            gravity = 1.62;
            airResistance = false;
            break;
        case 'air-drag-test':
            velocity = 50;
            angle = 30;
            airResistance = true;
            break;
        case 'zero-g':
            velocity = 15;
            angle = 10;
            gravity = 0;
            airResistance = false;
            break;
    }

    // Update UI elements
    inpVelocity.value = velocity;
    inpAngle.value = angle;
    inpGravity.value = gravity;
    chkAirRes.checked = airResistance;

    updateDisplays();
    drawFrame();
}

init();
