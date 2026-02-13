// Fallback JS Physics (Same as before)
class JSPhysics {
    constructor(x, y, speed, angleDeg) {
        this.x = x;
        this.y = y;
        const angleRad = angleDeg * (Math.PI / 180);
        this.vx = speed * Math.cos(angleRad);
        this.vy = speed * Math.sin(angleRad);
        this.time = 0;
    }

    update(dt, gravity, airResistanceEnabled) {
        this.time += dt;
        let ax = 0;
        let ay = -gravity;
        if (airResistanceEnabled) {
            const k = 0.2;
            ax -= k * this.vx;
            ay -= k * this.vy;
        }
        this.vx += ax * dt;
        this.vy += ay * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
}

// WASM Module Loader
let wasmModule = null;
let wasmReady = false;

// Try to load the Emscripten generated module
// This assumes physics.js is loaded via script tag or dynamic import
// Since we are using modules, we need to be careful.
// Let's rely on the user dragging the generated physics.js into the folder.

// WASM Function Wrappers
let init_projectile, update_projectile, get_x, get_y, get_vx, get_vy, get_time;

function wrapWasmFunctions() {
    if (!window.Module.cwrap) return false;

    init_projectile = window.Module.cwrap('init_projectile', null, ['number', 'number', 'number', 'number']);
    update_projectile = window.Module.cwrap('update_projectile', null, ['number', 'number', 'number']);
    get_x = window.Module.cwrap('get_x', 'number', []);
    get_y = window.Module.cwrap('get_y', 'number', []);
    get_vx = window.Module.cwrap('get_vx', 'number', []);
    get_vy = window.Module.cwrap('get_vy', 'number', []);
    get_time = window.Module.cwrap('get_time', 'number', []);

    return true;
}

export class Projectile {
    constructor(x, y, speed, angleDeg) {
        this.useWasm = !!window.wasmReady && wrapWasmFunctions();
        this.startX = x;
        this.startY = y;

        if (this.useWasm) {
            // Re-initialize WASM state
            init_projectile(x, y, speed, angleDeg);
            this.vx = get_vx();
            this.vy = get_vy();
        } else {
            console.warn("WASM not ready, using JS fallback");
            this.jsPhysics = new JSPhysics(x, y, speed, angleDeg);
            this.vx = this.jsPhysics.vx;
            this.vy = this.jsPhysics.vy;
        }

        this.x = x;
        this.y = y;
        this.time = 0;

        this.path = [{ x, y, vx: this.vx, vy: this.vy, time: 0 }];
        this.radius = 0.5;
    }

    update(dt, gravity, airResistanceEnabled) {
        if (this.useWasm) {
            update_projectile(dt, gravity, airResistanceEnabled ? 1 : 0);
            const nx = get_x();
            const ny = get_y();

            if (isNaN(nx) || isNaN(ny)) {
                console.error("WASM returned NaN, falling back to JS physics");
                this.useWasm = false;
                this.jsPhysics = new JSPhysics(this.x, this.y, this.vx, this.vy); // Note: Simplified fallback init
                this.jsPhysics.time = this.time;
                // Continue with JS update in the same frame
                this.jsPhysics.update(dt, gravity, airResistanceEnabled);
                this.x = this.jsPhysics.x;
                this.y = this.jsPhysics.y;
                this.vx = this.jsPhysics.vx;
                this.vy = this.jsPhysics.vy;
                this.time = this.jsPhysics.time;
            } else {
                this.x = nx;
                this.y = ny;
                this.vx = get_vx();
                this.vy = get_vy();
                this.time = get_time();
            }
        } else {
            this.jsPhysics.update(dt, gravity, airResistanceEnabled);
            this.x = this.jsPhysics.x;
            this.y = this.jsPhysics.y;
            this.vx = this.jsPhysics.vx;
            this.vy = this.jsPhysics.vy;
            this.time = this.jsPhysics.time;
        }

        // Common path storage
        if (this.time % 0.05 < dt) {
            this.path.push({
                x: this.x,
                y: this.y,
                vx: this.vx,
                vy: this.vy,
                time: this.time
            });
        }
    }
}

// Global function to initialize WASM from main.js or index.html
window.initWasm = async function () {
    console.log("WASM status: ", window.wasmReady ? "Ready" : "Waiting...");
}

// Emscripten Module handshake is now handled in index.html
if (window.wasmReady) {
    console.log("WASM already ready in engine.js");
} else {
    window.onWasmReady = () => {
        console.log("WASM became ready for engine.js");
    };
}
