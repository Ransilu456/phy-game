export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Scale: Pixels per Meter
        this.baseScale = 10;
        this.zoom = 1.0;
        this.targetZoom = 1.0;

        // Origin offset (bottom-left)
        this.originX = 50;
        this.originY = 0; // Set in resize

        // Manual Panning
        this.manualPanX = 0;
        this.manualPanY = 0;

        this.resize();
        // Use a small delay/debounce for better resize performance
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.resize(), 100);
        });
    }

    get scale() {
        return this.baseScale * this.zoom;
    }

    setZoom(level, immediate = false) {
        this.targetZoom = Math.max(0.1, Math.min(level, 5.0));
        if (immediate) this.zoom = this.targetZoom;
    }

    updateZoom(dt) {
        const lerpFactor = 4.0; // Increased from 2.0 for faster responsiveness
        const diff = this.targetZoom - this.zoom;
        if (Math.abs(diff) < 0.001) {
            this.zoom = this.targetZoom;
            return false;
        }
        this.zoom += diff * Math.min(1, dt * lerpFactor);
        return true;
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const parent = this.canvas.parentElement;
        const rect = parent.getBoundingClientRect();

        // Set display size (css pixels)
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';

        // Set actual size in memory (scaled by DPR)
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        // Normalize coordinate system to use css pixels for drawing logic
        this.ctx.scale(dpr, dpr);

        // Re-calculate origin based on new height (in css pixels)
        this.originY = rect.height - 50;

        // Trigger a redraw if main.js provides a callback or drawFrame is global
        if (window.drawFrame) window.drawFrame();
    }

    // Convert Physics Coordinates (Meters) to Canvas Coordinates (Pixels)
    toCanvasX(x) {
        return this.originX + (x * this.scale) + this.manualPanX;
    }

    toCanvasY(y) {
        return this.originY - (y * this.scale) + this.manualPanY;
    }

    follow(x, y, dt) {
        const parent = this.canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const targetPanX = centerX - this.originX - (x * this.scale);
        const targetPanY = centerY - this.originY + (y * this.scale);

        // Smooth interpolation
        const lerpFactor = 5.0;
        this.manualPanX += (targetPanX - this.manualPanX) * Math.min(1, dt * lerpFactor);
        this.manualPanY += (targetPanY - this.manualPanY) * Math.min(1, dt * lerpFactor);
    }

    resetView() {
        this.manualPanX = 0;
        this.manualPanY = 0;
        this.targetZoom = 1.0;
        this.zoom = 1.0;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid() {
        const { width, height } = this.canvas;
        const ctx = this.ctx;

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();

        // Vertical lines (every 10 meters)
        for (let m = 0; m * this.scale < width; m += 10) {
            const x = this.toCanvasX(m);
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);

            // Labels
            ctx.fillStyle = '#64748b';
            ctx.font = '10px monospace';
            ctx.fillText(`${m}m`, x + 2, this.originY + 15);
        }

        // Horizontal lines (every 10 meters)
        for (let m = 0; m * this.scale < height; m += 10) {
            const y = this.toCanvasY(m);
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);

            // Labels
            if (m > 0) ctx.fillText(`${m}m`, 5, y - 2);
        }

        ctx.stroke();

        // Axes (Thicker)
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();

        // X-Axis
        ctx.moveTo(0, this.originY);
        ctx.lineTo(width, this.originY);

        // Y-Axis
        ctx.moveTo(this.originX, height);
        ctx.lineTo(this.originX, 0);

        ctx.stroke();
    }

    drawPath(path, color, lineWidth, dashed = false) {
        if (path.length < 2) return;
        const ctx = this.ctx;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        if (dashed) ctx.setLineDash([5, 5]);
        else ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(this.toCanvasX(path[0].x), this.toCanvasY(path[0].y));
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(this.toCanvasX(path[i].x), this.toCanvasY(path[i].y));
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset
    }

    drawVector(startX, startY, vx, vy, color, label) {
        const ctx = this.ctx;
        const ex = startX + vx * 2; // Scale factor for visibility
        const ey = startY - vy * 2;

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;

        // Line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(ey - startY, ex - startX);
        const headLen = 8;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        if (label) {
            ctx.font = 'bold 10px Roboto';
            ctx.fillText(label, ex + 5, ey + 5);
        }
    }

    drawMissileHUD(projectile) {
        const ctx = this.ctx;
        const padding = 20;
        const width = 150;
        const height = 100;
        const x = this.canvas.width - width - padding;
        const y = padding;

        // HUD Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 10px Inter';
        ctx.fillText('MISSILE COCKPIT', x + 10, y + 20);

        // Fuel Gauge
        const fuelPct = projectile.fuel / 10; // Assuming max fuel is 10 for display
        ctx.fillStyle = '#334155';
        ctx.fillRect(x + 10, y + 35, width - 20, 10);
        ctx.fillStyle = fuelPct > 0.2 ? '#fb923c' : '#ef4444';
        ctx.fillRect(x + 10, y + 35, (width - 20) * Math.min(1, fuelPct), 10);
        ctx.fillStyle = '#fff';
        ctx.font = '8px Inter';
        ctx.fillText(`FUEL: ${Math.round(projectile.fuel * 10)}%`, x + 12, y + 43);

        // Compass / Heading
        const cx = x + 40;
        const cy = y + 75;
        const r = 20;
        ctx.strokeStyle = '#475569';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        const angleRad = projectile.heading * Math.PI / 180;
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angleRad) * r, cy - Math.sin(angleRad) * r);
        ctx.stroke();
        ctx.lineWidth = 1;

        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`HEADING: ${Math.round(projectile.heading)}°`, x + 70, y + 70);
        ctx.fillText(`THRUST: ${projectile.thrust} m/s²`, x + 70, y + 85);
    }

    drawAnalysis(projectile, showVectors, showAcceleration = false) {
        if (!showVectors) return;

        const cx = this.toCanvasX(projectile.x);
        const cy = this.toCanvasY(projectile.y);

        // Scale vectors for visualization
        const vScale = 2;
        const aScale = 5; // Acceleration is usually smaller, scale it more

        // Total Velocity (Gold)
        this.drawVector(cx, cy, projectile.vx * vScale, projectile.vy * vScale, '#eab308', 'v');

        // Total Acceleration (Purple) if enabled
        if (showAcceleration) {
            this.drawVector(cx, cy, projectile.ax * aScale, projectile.ay * aScale, '#a855f7', 'a');
        }

        // Components (Subtle)
        this.drawVector(cx, cy, projectile.vx * vScale, 0, '#38bdf8', 'vx');
        this.drawVector(cx, cy, 0, projectile.vy * vScale, '#ef4444', 'vy');
    }

    drawRelativeVelocity(p1, p2) {
        if (!p1 || !p2) return;

        const cx1 = this.toCanvasX(p1.x);
        const cy1 = this.toCanvasY(p1.y);

        // Relative Velocity Vector (v2 - v1)
        const relVx = p2.vx - p1.vx;
        const relVy = p2.vy - p1.vy;

        const vScale = 2;
        this.drawVector(cx1, cy1, relVx * vScale, relVy * vScale, '#22c55e', 'v_rel');
    }

    drawProjectile(projectile, showVectors = false, showAcceleration = false, label = "") {
        const ctx = this.ctx;
        const cx = this.toCanvasX(projectile.x);
        const cy = this.toCanvasY(projectile.y);
        const radiusPx = projectile.radius * this.scale > 3 ? projectile.radius * this.scale : 4;

        if (label === "Missile" && projectile.isActive) {
            this.drawMissileHUD(projectile);
        }

        // Draw Analysis if enabled
        this.drawAnalysis(projectile, showVectors, showAcceleration);

        // Draw Trail
        this.drawPath(projectile.path, label === "Ideal" ? 'rgba(234, 179, 8, 0.3)' : '#38bdf8', 2, label === "Ideal");

        // Thrust Effect
        if (projectile.isActive && projectile.fuel > 0 && projectile.thrust > 0) {
            const angleRad = projectile.heading * Math.PI / 180;
            const tx = cx - Math.cos(angleRad) * radiusPx * 1.5;
            const ty = cy + Math.sin(angleRad) * radiusPx * 1.5;

            ctx.fillStyle = '#fb923c';
            ctx.beginPath();
            ctx.arc(tx, ty, radiusPx * (0.5 + Math.random() * 0.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowColor = '#fb923c';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Draw Projectile Body
        ctx.fillStyle = label === "Missile" ? '#fb923c' : '#facc15';
        ctx.beginPath();
        ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (label) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px Roboto';
            ctx.fillText(label, cx + radiusPx + 2, cy - radiusPx - 2);
        }
    }

    drawTarget(targetDist, targetWidth, targetBaseY = 0) {
        const ctx = this.ctx;
        const x = this.toCanvasX(targetDist);
        const y = this.toCanvasY(targetBaseY);
        const widthPx = targetWidth * this.scale;

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x - widthPx / 2, y - 5, widthPx, 10);

        // Target text
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText("TARGET", x, y + 15);
        if (targetBaseY > 0) {
            ctx.fillText(`${targetBaseY}m`, x, y + 25);
        }
        ctx.textAlign = 'left'; // Reset
    }
}
