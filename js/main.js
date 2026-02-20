import { Projectile, wrapWasmFunctions } from './engine.js';

// WASM Initialization
window.onWasmReady = () => {
    console.log("Initializing WASM Physics Bridge...");
    window.wasmPhysics = wrapWasmFunctions(window.Module);
};

// If WASM already loaded (e.g. from cache)
if (window.wasmReady) {
    window.onWasmReady();
}
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

const chkMissileMode = document.getElementById('chk-missile-mode');
const missileParams = document.getElementById('missile-params');
const inpThrust = document.getElementById('inp-thrust');
const inpFuel = document.getElementById('inp-fuel');
const dispThrust = document.getElementById('disp-thrust');
const dispFuel = document.getElementById('disp-fuel');

const chkRelVel = document.getElementById('chk-rel-vel');
const relVelHud = document.getElementById('rel-vel-hud');
const valRelV = document.getElementById('val-rel-v');

const chkShowAccel = document.getElementById('chk-show-accel');

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
let previousProjectile = null; // For relative velocity
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
let showAcceleration = false;
let missileMode = false;
let thrust = 0;
let fuel = 0;

// Input State
const keys = {};

// Init
function init() {
    updateDisplays();

    // Resize observers are handled in classes, but initial draw needed
    drawFrame();

    // Keyboard Listeners
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        handleInputs();
    });
    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

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

    chkShowAccel.addEventListener('change', (e) => {
        showAcceleration = e.target.checked;
        drawFrame();
    });

    chkMissileMode.addEventListener('change', (e) => {
        missileMode = e.target.checked;
        missileParams.classList.toggle('hidden', !missileMode);

        // Update document theme for Missile Mode
        document.documentElement.classList.toggle('missile-alert', missileMode);

        if (!missileMode) {
            thrust = 0;
            fuel = 0;
        } else {
            thrust = parseFloat(inpThrust.value);
            fuel = parseFloat(inpFuel.value);
        }
    });

    inpThrust.addEventListener('input', (e) => {
        thrust = parseFloat(e.target.value);
        dispThrust.textContent = thrust;
        if (projectile && missileMode) projectile.setThrust(thrust);
    });

    inpFuel.addEventListener('input', (e) => {
        fuel = parseFloat(e.target.value);
        dispFuel.textContent = fuel;
    });

    chkRelVel.addEventListener('change', (e) => {
        relVelHud.classList.toggle('hidden', !e.target.checked);
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

    // Simulation Panning
    let isPanning = false;
    let startX, startY;

    const onPanStart = (x, y) => {
        isPanning = true;
        startX = x;
        startY = y;
        canvas.style.cursor = 'grabbing';
        // Disable auto-zoom when manually panning
        if (chkAutoZoom.checked) chkAutoZoom.checked = false;
    };

    const onPanMove = (x, y) => {
        if (!isPanning) return;
        const dx = x - startX;
        const dy = y - startY;
        renderer.manualPanX += dx;
        renderer.manualPanY += dy;
        startX = x;
        startY = y;
        drawFrame();
    };

    const onPanEnd = () => {
        isPanning = false;
        canvas.style.cursor = 'crosshair';
    };

    canvas.addEventListener('mousedown', e => {
        onPanStart(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', e => {
        onPanMove(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', onPanEnd);

    canvas.addEventListener('touchstart', e => {
        const touch = e.touches[0];
        onPanStart(touch.clientX, touch.clientY);
    }, { passive: true });

    window.addEventListener('touchmove', e => {
        const touch = e.touches[0];
        onPanMove(touch.clientX, touch.clientY);
    }, { passive: true });

    window.addEventListener('touchend', onPanEnd);

    // Initial render
    renderer.drawGrid();
}

function handleInputs() {
    if (!isSimulating || !projectile || !missileMode) return;

    // Steering (A/D or Arrows)
    const turnSpeed = 2; // Degrees per frame roughly
    if (keys['ArrowLeft'] || keys['KeyA']) {
        projectile.setHeading(projectile.heading + turnSpeed);
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        projectile.setHeading(projectile.heading - turnSpeed);
    }

    // Thrust (Space)
    const activeThrust = keys['Space'] ? parseFloat(inpThrust.value) || 20 : 0;
    projectile.setThrust(activeThrust);
}

function updateDisplays() {
    dispVelocity.textContent = velocity;
    dispAngle.textContent = angle;
    dispGravity.textContent = gravity;
    dispThrust.textContent = thrust;
    dispFuel.textContent = fuel;
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

    if (projectile) {
        previousProjectile = projectile; // Store for relative velocity
    }

    projectile = new Projectile(0, 0, velocity, angle, missileMode ? 0 : thrust, fuel);
    if (missileMode) projectile.setThrust(0); // Start off, let user press Space

    // Ideal projectile (no air resistance, no thrust for pure gravity comparison)
    if (chkShowIdeal.checked && (airResistance || missileMode)) {
        idealProjectile = new Projectile(0, 0, velocity, angle, 0, 0);
        idealProjectile.useWasm = false;
        idealProjectile.isIdeal = true;
    } else {
        idealProjectile = null;
    }

    isSimulating = true;
    game.lastHeight = 0;

    // Clear graphs
    plotter.resetPan();
    plotter.draw([]);

    animationId = requestAnimationFrame(loop);
}

function resetSimulation() {
    cancelAnimationFrame(animationId);
    isSimulating = false;
    projectile = null;
    previousProjectile = null;
    idealProjectile = null;
    historyTrajectories = [];
    renderer.clear();
    renderer.drawGrid();
    renderer.resetView(); // Core change for panning
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
    valRelV.textContent = "0.00 m/s";
}

function loop(timestamp) {
    if (!timestamp) {
        animationId = requestAnimationFrame(loop);
        return;
    }
    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Guard against NaN or extreme jumps
    if (!isFinite(dt) || dt > 0.1) dt = 0.016;

    const cleanDt = Math.min(dt, 0.05);

    // Update zoom animation
    const zoomChanged = renderer.updateZoom(cleanDt);
    if (zoomChanged) {
        // Sync zoom slider for visual feedback
        inpZoom.value = renderer.targetZoom;
        dispZoom.textContent = Math.round(renderer.zoom * 100);
    }

    if (isSimulating && projectile) {
        handleInputs(); // Process real-time inputs per frame

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
            }
        }

        // Analysis & Stats (Run once per frame)
        updateEnergyDisplay(projectile);

        if (projectile.y > game.lastHeight) {
            game.lastHeight = projectile.y;
            valHeight.textContent = game.lastHeight.toFixed(2);
        }

        // Relative Velocity Calculation
        if (previousProjectile && chkRelVel.checked) {
            const relVx = projectile.vx - previousProjectile.vx;
            const relVy = projectile.vy - previousProjectile.vy;
            const relV = Math.sqrt(relVx * relVx + relVy * relVy);
            valRelV.textContent = relV.toFixed(2) + " m/s";
        }

        // Smart Auto-Zoom Calculation (Run once per frame)
        if (chkAutoZoom.checked) {
            // Use incrementally updated bbox for efficiency
            let { maxX, maxY } = projectile.bbox;

            // Proactive Lookahead
            const lookaheadTime = 1.0;
            const futureX = projectile.x + projectile.vx * lookaheadTime;
            const futureY = projectile.y + projectile.vy * lookaheadTime;

            maxX = Math.max(maxX, projectile.x, futureX);
            maxY = Math.max(maxY, projectile.y, futureY);

            // Include target in view
            if (game.isActive) {
                maxX = Math.max(maxX, game.targetDist + 10);
            }

            maxX = Math.max(maxX, 40);
            maxY = Math.max(maxY, 15);

            const padding = 0.75;
            const zoomX = (renderer.canvas.width * padding - renderer.originX) / (maxX * renderer.baseScale);
            const zoomY = (renderer.canvas.height * padding) / (maxY * renderer.baseScale);

            const idealZoom = Math.min(zoomX, zoomY, 1.5);
            renderer.setZoom(idealZoom);
        }

        // Real-time graph updates
        plotter.draw(projectile.path);
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
    const v2 = p.vx * p.vx + p.vy * p.vy;
    const ke = 0.5 * v2;
    const pe = gravity * Math.max(0, p.y);
    const te = ke + pe;

    valKE.textContent = ke.toFixed(1);
    valPE.textContent = pe.toFixed(1);
    valTE.textContent = te.toFixed(1);

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
        renderer.drawProjectile(idealProjectile, false, false, "Ideal");
    }

    if (previousProjectile && chkRelVel.checked) {
        renderer.drawProjectile(previousProjectile, false, false, "Prev");
        renderer.drawRelativeVelocity(previousProjectile, projectile);
    }

    if (projectile) {
        renderer.drawProjectile(projectile, showVectors, showAcceleration, missileMode ? "Missile" : "Ball");

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
            missileMode = false;
            break;
        case 'moon-jump':
            velocity = 20;
            angle = 45;
            gravity = 1.62;
            airResistance = false;
            missileMode = false;
            break;
        case 'air-drag-test':
            velocity = 50;
            angle = 30;
            airResistance = true;
            missileMode = false;
            break;
        case 'zero-g':
            velocity = 15;
            angle = 10;
            gravity = 0;
            airResistance = false;
            missileMode = false;
            break;
    }

    // Update UI elements
    inpVelocity.value = velocity;
    inpAngle.value = angle;
    inpGravity.value = gravity;
    chkAirRes.checked = airResistance;
    chkMissileMode.checked = missileMode;
    missileParams.classList.toggle('hidden', !missileMode);

    updateDisplays();
    drawFrame();
}

init();
