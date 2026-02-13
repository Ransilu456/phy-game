export class GraphPlotter {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.resize(), 100);
        });
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const parent = this.canvas.parentElement;
        const rect = parent.getBoundingClientRect();

        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);

        // Redraw on resize if data exists
        if (this.lastData && window.drawFrame) window.drawFrame();
    }

    draw(dataPoints) {
        this.lastData = dataPoints;
        const ctx = this.ctx;
        const parent = this.canvas.parentElement;
        const width = parent.clientWidth;
        const height = parent.clientHeight;

        ctx.clearRect(0, 0, width, height);

        // Responsive Layout: 
        // Large screen: Side-by-side
        // Mobile screen: Vertical stack
        const isSmall = width < 400;

        if (isSmall) {
            const gh = height / 2;
            this.drawGraph(ctx, dataPoints, 'y', 't', 0, 0, width, gh, 'y vs t');
            this.drawGraph(ctx, dataPoints, 'vy', 't', 0, gh, width, gh, 'vy vs t');
        } else {
            const fw = width / 2;
            this.drawGraph(ctx, dataPoints, 'y', 't', 0, 0, fw, height, 'Height (y) vs Time (t)');
            this.drawGraph(ctx, dataPoints, 'vy', 't', fw, 0, fw, height, 'Velocity Y (vy) vs Time (t)');
        }
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
