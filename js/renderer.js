export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Scale: Pixels per Meter
        this.baseScale = 10;
        this.zoom = 1.0;

        // Origin offset (bottom-left)
        this.originX = 50;
        this.originY = this.canvas.height - 50;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    get scale() {
        return this.baseScale * this.zoom;
    }

    setZoom(level) {
        this.zoom = Math.max(1, Math.min(level, 5.0)); // Min 1.0, Max 5.0
    }

    resize() {
        // Adjust canvas size to parent container
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;

        // Re-calculate origin based on new height
        this.originY = this.canvas.height - 50;
    }

    // Convert Physics Coordinates (Meters) to Canvas Coordinates (Pixels)
    toCanvasX(x) {
        return this.originX + (x * this.scale);
    }

    toCanvasY(y) {
        return this.originY - (y * this.scale);
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

    drawAnalysis(projectile, showVectors) {
        if (!showVectors) return;

        const cx = this.toCanvasX(projectile.x);
        const cy = this.toCanvasY(projectile.y);

        // Scale vectors for visualization (e.g., 1m/s = 2px)
        const vecScale = 2;

        // Total Velocity (Gold)
        this.drawVector(cx, cy, projectile.vx * vecScale, projectile.vy * vecScale, '#eab308', 'v');

        // Components (Subtle)
        this.drawVector(cx, cy, projectile.vx * vecScale, 0, '#38bdf8', 'vx');
        this.drawVector(cx, cy, 0, projectile.vy * vecScale, '#ef4444', 'vy');
    }

    drawProjectile(projectile, showVectors = false) {
        const ctx = this.ctx;
        const cx = this.toCanvasX(projectile.x);
        const cy = this.toCanvasY(projectile.y);
        const radiusPx = projectile.radius * this.scale > 3 ? projectile.radius * this.scale : 4;

        // Draw Analysis if enabled
        this.drawAnalysis(projectile, showVectors);

        // Draw Trail using shared method
        this.drawPath(projectile.path, '#38bdf8', 2);

        // Draw Projectile Body
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
    }

    drawTarget(targetDist, targetWidth) {
        const ctx = this.ctx;
        const x = this.toCanvasX(targetDist);
        const y = this.toCanvasY(0);
        const widthPx = targetWidth * this.scale;

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x - widthPx / 2, y, widthPx, 10);

        // Target text
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText("TARGET", x, y + 25);
        ctx.textAlign = 'left'; // Reset
    }
}
