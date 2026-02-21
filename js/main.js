import { Projectile, wrapWasmFunctions } from './engine.js';
import { Renderer } from './renderer.js';
import { Game } from './game.js';
import { GraphPlotter } from './graphs.js';
import { ComponentLoader } from './ui.js';
import { ThemeManager } from './themes.js';

// WASM Initialization
window.onWasmReady = () => {
    console.log("Initializing WASM Physics Bridge...");
    if (window.Module) {
        window.wasmPhysics = wrapWasmFunctions(window.Module);
    }
};

if (window.wasmReady) {
    window.onWasmReady();
}

// Global State
let renderer, plotter, game;
let projectile = null;
let previousProjectile = null;
let idealProjectile = null;
let historyTrajectories = [];
let animationId = null;
let isSimulating = false;
let isPanning = false;
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

const keys = {};

async function initApp() {
    try {
        console.log("Starting App Initialization...");

        // 1. Load Components
        await ComponentLoader.loadAll();
        console.log("Components loaded.");

        // 2. Initialize Core DOM-dependent Classes
        const canvas = document.getElementById('gameCanvas');
        const graphCanvas = document.getElementById('graphCanvas');

        if (!canvas || !graphCanvas) {
            console.error("Canvas elements not found:", { canvas, graphCanvas });
            throw new Error("Required canvas elements not found. Retrying in 500ms...");
        }

        renderer = new Renderer(canvas);
        plotter = new GraphPlotter(graphCanvas);
        game = new Game();

        // 3. Initialize Theme Manager
        const themeManager = new ThemeManager();
        themeManager.init();

        // 4. Setup Event Listeners
        setupEventListeners();

        // 5. Initial Render
        window.drawFrame = drawFrame;

        // Reset labels to (0,0,0)
        ['val-range', 'val-height', 'val-time'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = "0.00";
        });

        updateDisplays();
        drawFrame();
        renderer.drawGrid();

        // Start animation loop to handle initial camera centering and transitions
        animationId = requestAnimationFrame(loop);

        console.log("Physics Application Initialized Successfully.");
    } catch (error) {
        console.error("Initialization failed:", error);
        // Retry logic for dynamic loading races
        setTimeout(initApp, 500);
    }
}

function setupEventListeners() {
    // Inputs mapping after components are loaded
    const inputs = {
        velocity: document.getElementById('inp-velocity'),
        angle: document.getElementById('inp-angle'),
        gravity: document.getElementById('inp-gravity'),
        airRes: document.getElementById('chk-air-resistance'),
        planet: document.getElementById('sel-planet'),
        missileMode: document.getElementById('chk-missile-mode'),
        thrust: document.getElementById('inp-thrust'),
        fuel: document.getElementById('inp-fuel'),
        relVel: document.getElementById('chk-rel-vel'),
        showVectors: document.getElementById('chk-show-vectors'),
        showAccel: document.getElementById('chk-show-accel'),
        zoom: document.getElementById('inp-zoom'),
        autoZoom: document.getElementById('chk-auto-zoom'),
        keepHistory: document.getElementById('chk-keep-history'),
        showIdeal: document.getElementById('chk-show-ideal')
    };

    const buttons = {
        fire: document.getElementById('btn-fire'),
        reset: document.getElementById('btn-reset'),
        challenge: document.getElementById('btn-challenge-start'),
        zoomReset: document.getElementById('btn-zoom-reset'),
        toggleHub: document.getElementById('btn-toggle-hub'),
        mobileControls: document.getElementById('btn-mobile-controls'),
        closeControls: document.getElementById('btn-close-controls')
    };

    // Keyboard
    window.addEventListener('keydown', (e) => { keys[e.code] = true; handleInputs(); });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });

    // Parameter Updates
    inputs.velocity?.addEventListener('input', (e) => {
        velocity = parseFloat(e.target.value);
        document.getElementById('disp-velocity').textContent = velocity;
    });

    inputs.angle?.addEventListener('input', (e) => {
        angle = parseFloat(e.target.value);
        document.getElementById('disp-angle').textContent = angle;
    });

    inputs.gravity?.addEventListener('input', (e) => {
        gravity = parseFloat(e.target.value);
        document.getElementById('disp-gravity').textContent = gravity;
    });

    inputs.planet?.addEventListener('change', (e) => {
        gravity = parseFloat(e.target.value);
        if (inputs.gravity) inputs.gravity.value = gravity;
        document.getElementById('disp-gravity').textContent = gravity;
    });

    inputs.airRes?.addEventListener('change', (e) => airResistance = e.target.checked);

    inputs.showVectors?.addEventListener('change', (e) => { showVectors = e.target.checked; drawFrame(); });
    inputs.showAccel?.addEventListener('change', (e) => { showAcceleration = e.target.checked; drawFrame(); });

    inputs.missileMode?.addEventListener('change', (e) => {
        missileMode = e.target.checked;
        const mp = document.getElementById('missile-params');
        if (mp) mp.classList.toggle('hidden', !missileMode);
        document.documentElement.classList.toggle('missile-alert', missileMode);
        if (!missileMode) { thrust = 0; fuel = 0; }
        else { thrust = parseFloat(inputs.thrust?.value || 0); fuel = parseFloat(inputs.fuel?.value || 0); }
    });

    inputs.thrust?.addEventListener('input', (e) => {
        thrust = parseFloat(e.target.value);
        document.getElementById('disp-thrust').textContent = thrust;
        if (projectile && missileMode) projectile.setThrust(thrust);
    });

    inputs.fuel?.addEventListener('input', (e) => {
        fuel = parseFloat(e.target.value);
        document.getElementById('disp-fuel').textContent = fuel;
    });

    inputs.zoom?.addEventListener('input', (e) => {
        zoom = parseFloat(e.target.value);
        renderer.setZoom(zoom, true);
        document.getElementById('disp-zoom').textContent = Math.round(zoom * 100);
        if (inputs.autoZoom && inputs.autoZoom.checked) inputs.autoZoom.checked = false;
        drawFrame();
    });

    buttons.zoomReset?.addEventListener('click', () => {
        zoom = 1.0;
        if (inputs.zoom) inputs.zoom.value = 1.0;
        renderer.setZoom(1.0);
        document.getElementById('disp-zoom').textContent = "100";
        drawFrame();
    });

    buttons.toggleHub?.addEventListener('click', () => {
        const hubContent = document.getElementById('hub-content');
        if (hubContent) {
            hubContent.classList.toggle('hidden');
            buttons.toggleHub.textContent = hubContent.classList.contains('hidden') ? "Expand" : "Collapse";
        }
    });

    buttons.fire?.addEventListener('click', fireProjectile);
    buttons.reset?.addEventListener('click', resetSimulation);
    buttons.challenge?.addEventListener('click', startChallenge);

    buttons.mobileControls?.addEventListener('click', () => {
        const cp = document.getElementById('controls-panel');
        if (cp) cp.classList.remove('translate-x-full');
    });

    buttons.closeControls?.addEventListener('click', () => {
        const cp = document.getElementById('controls-panel');
        if (cp) cp.classList.add('translate-x-full');
    });

    // Panning
    initPanning();
}

function initPanning() {
    if (!renderer) return;
    const canvas = renderer.canvas;
    let startX, startY;

    const onPanStart = (x, y) => {
        isPanning = true; startX = x; startY = y;
        canvas.style.cursor = 'grabbing';
        const chkAutoZoom = document.getElementById('chk-auto-zoom');
        if (chkAutoZoom?.checked) chkAutoZoom.checked = false;
    };

    const onPanMove = (x, y) => {
        if (!isPanning) return;
        renderer.manualPanX += x - startX;
        renderer.manualPanY += y - startY;
        startX = x; startY = y;
        drawFrame();
    };

    canvas.addEventListener('mousedown', e => onPanStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => onPanMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => { isPanning = false; canvas.style.cursor = 'crosshair'; });
}

function handleInputs() {
    if (!isSimulating || !projectile || !missileMode) return;
    const turnSpeed = 2;
    if (keys['ArrowLeft'] || keys['KeyA']) projectile.setHeading(projectile.heading + turnSpeed);
    if (keys['ArrowRight'] || keys['KeyD']) projectile.setHeading(projectile.heading - turnSpeed);
    const it = document.getElementById('inp-thrust');
    const activeThrust = keys['Space'] ? parseFloat(it?.value || 20) : 0;
    projectile.setThrust(activeThrust);
}

function updateDisplays() {
    const ids = ['disp-velocity', 'disp-angle', 'disp-gravity', 'disp-thrust', 'disp-fuel'];
    const vals = [velocity, angle, gravity, thrust, fuel];
    ids.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = vals[i];
    });
}

function fireProjectile() {
    if (isSimulating) return;
    const chkKeepHistory = document.getElementById('chk-keep-history');
    const chkShowIdeal = document.getElementById('chk-show-ideal');

    if (!chkKeepHistory?.checked) historyTrajectories = [];
    else if (projectile) {
        historyTrajectories.push(projectile.path);
        if (historyTrajectories.length > 5) historyTrajectories.shift();
    }

    if (projectile) previousProjectile = projectile;

    projectile = new Projectile(0, 0, velocity, angle, missileMode ? 0 : thrust, fuel);
    if (missileMode) projectile.setThrust(0);

    if (chkShowIdeal?.checked && (airResistance || missileMode)) {
        idealProjectile = new Projectile(0, 0, velocity, angle, 0, 0);
        idealProjectile.useWasm = false;
        idealProjectile.isIdeal = true;
    } else {
        idealProjectile = null;
    }

    isSimulating = true;
    game.lastHeight = 0;
    plotter.resetPan();
    plotter.draw([]);
    animationId = requestAnimationFrame(loop);

    if (window.innerWidth < 1024) {
        const cp = document.getElementById('controls-panel');
        if (cp) cp.classList.add('translate-x-full');
    }
}

function resetSimulation() {
    cancelAnimationFrame(animationId);
    isSimulating = false;
    projectile = null;
    previousProjectile = null;
    idealProjectile = null;
    historyTrajectories = [];
    if (renderer) {
        renderer.clear();
        renderer.drawGrid();
        renderer.resetView();
    }
    plotter.resetPan();

    const chkAutoZoom = document.getElementById('chk-auto-zoom');
    if (chkAutoZoom?.checked) {
        if (renderer) renderer.setZoom(1.0);
    } else {
        if (renderer) renderer.setZoom(zoom, true);
    }

    if (game.isActive && renderer) renderer.drawTarget(game.targetDist, game.targetWidth);

    ['val-range', 'val-height', 'val-time'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = "0.00";
    });
}

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (!isFinite(dt) || dt > 0.1) dt = 0.016;

    const cleanDt = Math.min(dt, 0.05);
    const zoomChanged = renderer ? renderer.updateZoom(cleanDt) : false;
    if (zoomChanged) {
        const iz = document.getElementById('inp-zoom');
        if (iz) iz.value = renderer.targetZoom;
        const dz = document.getElementById('disp-zoom');
        if (dz) dz.textContent = Math.round(renderer.zoom * 100);
    }

    const chkAutoZoom = document.getElementById('chk-auto-zoom');
    let cameraMoving = false;
    if (renderer && !isPanning) {
        if (isSimulating && projectile && chkAutoZoom?.checked) {
            cameraMoving = renderer.follow(projectile.x, projectile.y, cleanDt);
        } else if (!isSimulating) {
            // Auto-center on origin when idle to ensure preview is visible
            cameraMoving = renderer.follow(0, 0, cleanDt);
        }
    }

    if (isSimulating && projectile) {
        handleInputs();
        const steps = 5;
        const subDt = cleanDt / steps;

        for (let i = 0; i < steps; i++) {
            projectile.update(subDt, gravity, airResistance);
            if (idealProjectile) idealProjectile.update(subDt, gravity, false);
            const collision = game.checkCollision(projectile);

            if (collision.ground || projectile.y < -10 || projectile.x > 1000) {
                isSimulating = false;
                projectile.y = Math.max(0, projectile.y);
                const vr = document.getElementById('val-range');
                if (vr) vr.textContent = projectile.x.toFixed(2);
                const vh = document.getElementById('val-height');
                if (vh) vh.textContent = game.lastHeight.toFixed(2);
                const vt = document.getElementById('val-time');
                if (vt) vt.textContent = projectile.time.toFixed(2);

                if (game.isActive) {
                    game.updateScore(collision.hit);
                    const sc = document.getElementById('score');
                    if (sc) sc.textContent = game.score;
                    if (collision.hit) {
                        const td = document.getElementById('target-dist');
                        if (td) td.textContent = game.targetDist + "m" + (game.targetBaseY > 0 ? ` @ ${game.targetBaseY}m` : '');
                        startChallenge();
                    }
                }
            }
        }
        updateMemoryViews();
        updateEnergyDisplay(projectile);
        if (projectile.y > game.lastHeight) {
            game.lastHeight = projectile.y;
            const vh = document.getElementById('val-height');
            if (vh) vh.textContent = game.lastHeight.toFixed(2);
        }

        if (chkAutoZoom?.checked && renderer) {
            let { maxX, maxY } = projectile.bbox;
            maxX = Math.max(maxX, projectile.x + projectile.vx, 40);
            maxY = Math.max(maxY, projectile.y + projectile.vy, 15);
            if (game.isActive) maxX = Math.max(maxX, game.targetDist + 10);
            const idealZoom = Math.min((renderer.canvas.width * 0.75 - renderer.originX) / (maxX * renderer.baseScale), (renderer.canvas.height * 0.75) / (maxY * renderer.baseScale), 1.5);
            renderer.setZoom(idealZoom);
        }
        plotter.draw(projectile.path);
    }

    drawFrame();
    if (isSimulating || zoomChanged || cameraMoving) animationId = requestAnimationFrame(loop);
    else { animationId = null; lastTime = 0; }
}

function updateEnergyDisplay(p) {
    const v2 = p.vx * p.vx + p.vy * p.vy;
    const ke = 0.5 * v2;
    const pe = gravity * Math.max(0, p.y);
    const te = ke + pe;
    const vk = document.getElementById('val-ke');
    if (vk) vk.textContent = ke.toFixed(1);
    const vp = document.getElementById('val-pe');
    if (vp) vp.textContent = pe.toFixed(1);
    const vt = document.getElementById('val-te');
    if (vt) vt.textContent = te.toFixed(1);
    if (!game.maxEnergy || !isSimulating) game.maxEnergy = te || 100;
    const bk = document.getElementById('bar-ke');
    if (bk) bk.style.width = Math.min(100, (ke / game.maxEnergy) * 100) + '%';
    const bp = document.getElementById('bar-pe');
    if (bp) bp.style.width = Math.min(100, (pe / game.maxEnergy) * 100) + '%';
}

function drawFrame() {
    if (!renderer) return;
    renderer.clear(); renderer.drawGrid();
    historyTrajectories.forEach(path => renderer.drawPath(path, '#334155', 1));
    if (game.isActive) renderer.drawTarget(game.targetDist, game.targetWidth, game.targetBaseY);
    if (idealProjectile) renderer.drawProjectile(idealProjectile, false, false, "Ideal");

    if (projectile) {
        renderer.drawProjectile(projectile, showVectors, showAcceleration, missileMode ? "Missile" : "Ball");
        const vr = document.getElementById('val-range');
        if (vr) vr.textContent = projectile.x.toFixed(2);
        const vt = document.getElementById('val-time');
        if (vt) vt.textContent = projectile.time.toFixed(2);
    } else {
        // Show Ghost Projectile at Origin if no simulation active
        renderer.drawGhostProjectile(0, 0, 0.5, missileMode ? "Missile" : "Ball");
    }
}

function startChallenge() {
    const data = game.startChallenge();
    const ci = document.getElementById('challenge-info');
    if (ci) ci.classList.remove('hidden');

    const sc = document.getElementById('score');
    if (sc) sc.textContent = data.score;

    const td = document.getElementById('target-dist');
    if (td) td.textContent = data.targetDist + "m" + (data.targetY > 0 ? ` @ ${data.targetY}m` : '');

    const desc = document.getElementById('challenge-desc');
    if (desc) desc.textContent = data.description;

    resetSimulation();
}

// Global drawFrame will be set in initApp after renderer is ready

initApp();
