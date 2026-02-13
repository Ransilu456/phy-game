export class GraphPlotter {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
    }

    draw(dataPoints) {
        const ctx = this.ctx;
        const { width, height } = this.canvas;

        ctx.clearRect(0, 0, width, height);

        // Simple Layout: Two side-by-side graphs
        // 1. y vs t (Position-Time)
        // 2. vy vs t (Velocity-Time)

        const fw = width / 2;

        this.drawGraph(ctx, dataPoints, 'y', 't', 0, 0, fw, height, 'Height (y) vs Time (t)');
        this.drawGraph(ctx, dataPoints, 'vy', 't', fw, 0, fw, height, 'Velocity Y (vy) vs Time (t)');
    }

    drawGraph(ctx, data, keyY, keyX, xOffset, yOffset, w, h, title) {
        const padding = 30;
        const graphW = w - padding * 2;
        const graphH = h - padding * 2;

        ctx.save();
        ctx.translate(xOffset, yOffset);

        // Axes
        ctx.strokeStyle = '#64748b'; // Brighter slate
        ctx.lineWidth = 2; // Thicker axes
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, h - padding);
        ctx.lineTo(w - padding, h - padding);
        ctx.stroke();

        // Title
        ctx.fillStyle = '#cbd5e1'; // Brighter text
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(title, padding, padding - 10);

        if (data.length < 2) {
            ctx.restore();
            return;
        }

        // Find Scalers
        // Assume t starts at 0
        const maxT = data[data.length - 1].time;

        // Find min/max for Y
        let maxY = -Infinity;
        let minY = Infinity;

        for (let p of data) {
            if (p[keyY] > maxY) maxY = p[keyY];
            if (p[keyY] < minY) minY = p[keyY];
        }

        // Force Y axis to include 0 if possible, or center
        if (minY > 0) minY = 0;
        if (maxY < 0) maxY = 0;

        // Add headroom
        const rangeY = (maxY - minY) || 1;

        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
            const p = data[i];

            // Normalize X (Time)
            const nx = (p[keyX] / maxT) * graphW;
            const px = padding + nx;

            // Normalize Y
            // height - padding is Y=minY (approximately)
            // padding is Y=maxY

            const ny = ((p[keyY] - minY) / rangeY) * graphH;
            const py = (h - padding) - ny;

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }

        ctx.stroke();
        ctx.restore();
    }
}
