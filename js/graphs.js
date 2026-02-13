export class GraphPlotter {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Panning state
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.resize();
        this.initEvents();

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.resize(), 100);
        });
    }

    initEvents() {
        const onStart = (x, y) => {
            if (this.isMouseInside(x, y)) {
                this.isDragging = true;
                this.lastMouseX = x;
                this.lastMouseY = y;
                this.canvas.style.cursor = 'grabbing';
            }
        };

        const onMove = (x, y) => {
            if (this.isDragging) {
                const dx = x - this.lastMouseX;
                const dy = y - this.lastMouseY;
                this.panX += dx;
                this.panY += dy;
                this.lastMouseX = x;
                this.lastMouseY = y;
                if (window.drawFrame) window.drawFrame();
            }
        };

        const onEnd = () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        };

        this.canvas.addEventListener('mousedown', e => {
            const rect = this.canvas.getBoundingClientRect();
            onStart(e.clientX - rect.left, e.clientY - rect.top);
        });

        window.addEventListener('mousemove', e => {
            const rect = this.canvas.getBoundingClientRect();
            onMove(e.clientX - rect.left, e.clientY - rect.top);
        });

        window.addEventListener('mouseup', onEnd);
        this.canvas.style.cursor = 'grab';

        // Touch events
        this.canvas.addEventListener('touchstart', e => {
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            onStart(touch.clientX - rect.left, touch.clientY - rect.top);
            e.preventDefault();
        }, { passive: false });

        window.addEventListener('touchmove', e => {
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            onMove(touch.clientX - rect.left, touch.clientY - rect.top);
        }, { passive: false });

        window.addEventListener('touchend', onEnd);
    }

    isMouseInside(x, y) {
        return x >= 0 && x <= this.canvas.clientWidth && y >= 0 && y <= this.canvas.clientHeight;
    }

    resetPan() {
        this.panX = 0;
        this.panY = 0;
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

        // Axes (Static background)
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, h - padding);
        ctx.lineTo(w - padding, h - padding);
        ctx.stroke();

        // Title
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(title, padding, padding - 10);

        if (data.length < 2) {
            ctx.restore();
            return;
        }

        // Clipping region for data
        ctx.save();
        ctx.beginPath();
        ctx.rect(padding, padding, graphW, graphH);
        ctx.clip();

        // Apply Pan
        ctx.translate(this.panX, this.panY);

        // Find Scalers
        const maxT = data[data.length - 1].time;
        let maxY = -Infinity;
        let minY = Infinity;

        for (let p of data) {
            if (p[keyY] > maxY) maxY = p[keyY];
            if (p[keyY] < minY) minY = p[keyY];
        }

        if (minY > 0) minY = 0;
        if (maxY < 0) maxY = 0;
        const rangeY = (maxY - minY) || 1;

        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
            const p = data[i];
            const nx = (p[keyX] / maxT) * graphW;
            const px = padding + nx;
            const ny = ((p[keyY] - minY) / rangeY) * graphH;
            const py = (h - padding) - ny;

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }

        ctx.stroke();
        ctx.restore(); // End clipping & pan
        ctx.restore(); // End xOffset/yOffset
    }
}
