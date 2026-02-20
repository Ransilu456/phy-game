export function wrapWasmFunctions(Module) {
    if (!Module) return null;

    // Helper to get function either from Module (global) or Module.wasmExports (raw)
    const getFunc = (name) => {
        const func = Module[name] || (Module.asm && Module.asm[name]) || (Module.wasmExports && Module.wasmExports[name]);
        if (!func) console.warn(`WASM function ${name} not found!`);
        return func;
    };

    const _init = getFunc('_init_projectile');
    const _update = getFunc('_update_projectile');
    const _getX = getFunc('_get_x');
    const _getY = getFunc('_get_y');
    const _getVX = getFunc('_get_vx');
    const _getVY = getFunc('_get_vy');
    const _getAX = getFunc('_get_ax');
    const _getAY = getFunc('_get_ay');
    const _getTime = getFunc('_get_time');
    const _getFuel = getFunc('_get_fuel');
    const _getHeading = getFunc('_get_heading');
    const _isActive = getFunc('_is_active');
    const _setHeading = getFunc('_set_heading');
    const _setThrust = getFunc('_set_thrust');

    if (!_init || !_update) {
        console.error("Critical WASM functions missing. Falling back to JS physics.");
        return null;
    }

    return {
        init: (id, x, y, speed, angle, thrust, fuel) => _init(id, x, y, speed, angle, thrust, fuel),
        update: (id, dt, g, air) => _update(id, dt, g, air ? 1 : 0),
        getX: (id) => _getX(id),
        getY: (id) => _getY(id),
        getVX: (id) => _getVX(id),
        getVY: (id) => _getVY(id),
        getAX: (id) => _getAX(id),
        getAY: (id) => _getAY(id),
        getTime: (id) => _getTime(id),
        getFuel: (id) => (_getFuel ? _getFuel(id) : 0),
        getHeading: (id) => (_getHeading ? _getHeading(id) : 0),
        isActive: (id) => _isActive(id),
        setHeading: (id, angle) => _setHeading && _setHeading(id, angle),
        setThrust: (id, thrust) => _setThrust && _setThrust(id, thrust)
    };
}

// Fallback logic for when WASM core is not available
class JSPhysics {
    constructor() {
        this.projectiles = {};
    }

    init(id, x, y, speed, angle, thrust, fuel) {
        const rad = angle * Math.PI / 180;
        this.projectiles[id] = {
            x, y,
            vx: speed * Math.cos(rad),
            vy: speed * Math.sin(rad),
            ax: 0, ay: 0,
            time: 0,
            thrust, fuel,
            heading: rad,
            isActive: true
        };
    }

    setHeading(id, angleDeg) {
        if (this.projectiles[id]) {
            this.projectiles[id].heading = angleDeg * Math.PI / 180;
        }
    }

    setThrust(id, thrust) {
        if (this.projectiles[id]) {
            this.projectiles[id].thrust = thrust;
        }
    }

    update(id, dt, g, air) {
        const p = this.projectiles[id];
        if (!p || !p.isActive) return;

        p.ax = 0;
        p.ay = -g;

        if (p.fuel > 0 && p.thrust > 0) {
            p.ax += p.thrust * Math.cos(p.heading);
            p.ay += p.thrust * Math.sin(p.heading);
            p.fuel -= dt;
            if (p.fuel < 0) p.fuel = 0;
        }

        if (air) {
            const v = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (v > 0.1) {
                const k = 0.05;
                p.ax -= k * p.vx * v;
                p.ay -= k * p.vy * v;
            }
        }

        p.vx += p.ax * dt;
        p.vy += p.ay * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.time += dt;

        if (p.y < -50) p.isActive = false;
    }

    getX(id) { return this.projectiles[id]?.x || 0; }
    getY(id) { return this.projectiles[id]?.y || 0; }
    getVX(id) { return this.projectiles[id]?.vx || 0; }
    getVY(id) { return this.projectiles[id]?.vy || 0; }
    getAX(id) { return this.projectiles[id]?.ax || 0; }
    getAY(id) { return this.projectiles[id]?.ay || 0; }
    getTime(id) { return this.projectiles[id]?.time || 0; }
    getFuel(id) { return this.projectiles[id]?.fuel || 0; }
    getHeading(id) { return (this.projectiles[id]?.heading || 0) * 180 / Math.PI; }
    isActive(id) { return this.projectiles[id]?.isActive ? 1 : 0; }
}

const jsPhysics = new JSPhysics();

export class Projectile {
    static nextId = 0;

    constructor(x, y, speed, angleDeg, thrust = 0, fuel = 0) {
        this.id = Projectile.nextId++;
        if (Projectile.nextId >= 10) Projectile.nextId = 0;

        this.useWasm = !!window.wasmPhysics;
        this.physics = this.useWasm ? window.wasmPhysics : jsPhysics;

        this.physics.init(this.id, x, y, speed, angleDeg, thrust, fuel);

        // State for rendering
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.ax = 0;
        this.ay = 0;
        this.time = 0;
        this.fuel = fuel;
        this.heading = angleDeg;
        this.thrust = thrust;
        this.isActive = true;

        this.path = [{ x, y }];
        this.bbox = { minX: x, minY: y, maxX: x, maxY: y };
        this.radius = 0.5;
        this.isIdeal = false;
    }

    update(dt, gravity, airResistanceEnabled) {
        const safeDt = isFinite(dt) ? dt : 0.016;
        this.physics.update(this.id, safeDt, gravity, airResistanceEnabled);

        const newX = this.physics.getX(this.id);
        const newY = this.physics.getY(this.id);

        // Sanitize - Never allow NaN to propagate to state
        this.x = isFinite(newX) ? newX : this.x;
        this.y = isFinite(newY) ? newY : this.y;
        this.vx = isFinite(this.physics.getVX(this.id)) ? this.physics.getVX(this.id) : this.vx;
        this.vy = isFinite(this.physics.getVY(this.id)) ? this.physics.getVY(this.id) : this.vy;
        this.ax = isFinite(this.physics.getAX(this.id)) ? this.physics.getAX(this.id) : this.ax;
        this.ay = isFinite(this.physics.getAY(this.id)) ? this.physics.getAY(this.id) : this.ay;
        this.time = isFinite(this.physics.getTime(this.id)) ? this.physics.getTime(this.id) : this.time;

        const rawFuel = this.physics.getFuel ? this.physics.getFuel(this.id) : 0;
        this.fuel = isFinite(rawFuel) ? rawFuel : this.fuel;

        const rawHeading = this.physics.getHeading ? this.physics.getHeading(this.id) : 0;
        this.heading = isFinite(rawHeading) ? rawHeading : this.heading;

        this.isActive = this.physics.isActive(this.id) === 1;

        if (this.isActive && isFinite(this.x) && isFinite(this.y)) {
            this.path.push({ x: this.x, y: this.y, ax: this.ax, ay: this.ay });

            // Update bbox
            this.bbox.minX = Math.min(this.bbox.minX, this.x);
            this.bbox.minY = Math.min(this.bbox.minY, this.y);
            this.bbox.maxX = Math.max(this.bbox.maxX, this.x);
            this.bbox.maxY = Math.max(this.bbox.maxY, this.y);
        }
    }

    setHeading(angle) {
        if (this.physics.setHeading) this.physics.setHeading(this.id, angle);
        this.heading = angle;
    }

    setThrust(thrust) {
        if (this.physics.setThrust) this.physics.setThrust(this.id, thrust);
        this.thrust = thrust;
    }
}
