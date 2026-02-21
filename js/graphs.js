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
        if (!parent) return;
        const rect = parent.getBoundingClientRect();

        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);

        if (this.lastData && window.drawFrame) window.drawFrame();
    }

    draw(dataPoints) {
        this.lastData = dataPoints;
        const ctx = this.ctx;
        if (!this.canvas.parentElement) return;
        const width = this.canvas.parentElement.clientWidth;
        const height = this.canvas.parentElement.clientHeight;

        ctx.clearRect(0, 0, width, height);

        const fw = width; // Standard single graph layout for better space
        this.drawGraph(ctx, dataPoints, 'vy', 'time', 0, 0, fw, height, 'Velocity Y (vy) vs Time (t)');
    }

    drawGraph(ctx, data, keyY, keyX, xOffset, yOffset, w, h, title) {
        const paddingLeft = 45;
        const paddingBottom = 30;
        const paddingTop = 25;
        const paddingRight = 15;

        const graphW = w - paddingLeft - paddingRight;
        const graphH = h - paddingTop - paddingBottom;

        ctx.save();
        ctx.translate(xOffset, yOffset);

        // Axis Background (Win95 grey-white input area style)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(paddingLeft, paddingTop, graphW, graphH);

        // Inner Bevel
        ctx.strokeStyle = "#808080";
        ctx.lineWidth = 1;
        ctx.strokeRect(paddingLeft, paddingTop, graphW, graphH);
        ctx.strokeStyle = "#000000";
        ctx.strokeRect(paddingLeft - 1, paddingTop - 1, graphW + 2, graphH + 2);

        // Title
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(title, paddingLeft, paddingTop - 8);

        // Static Axes
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;

        if (data.length < 2) {
            ctx.restore();
            return;
        }

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

        // Draw Grid Lines & Ticks (Before clipping)
        ctx.strokeStyle = "#e5e7eb";
        ctx.setLineDash([2, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();

        // Horizontal Grid
        const gridSteps = 5;
        for (let i = 0; i <= gridSteps; i++) {
            const y = paddingTop + (i / gridSteps) * graphH;
            ctx.moveTo(paddingLeft, y);
            ctx.lineTo(paddingLeft + graphW, y);

            // Labels
            ctx.setLineDash([]);
            ctx.fillStyle = "#000000";
            ctx.font = "9px sans-serif";
            const val = maxY - (i / gridSteps) * rangeY;
            ctx.fillText(val.toFixed(1), 5, y + 3);
            ctx.setLineDash([2, 4]);
        }
        ctx.stroke();

        // Vertical Grid (Time)
        ctx.beginPath();
        for (let i = 0; i <= gridSteps; i++) {
            const x = paddingLeft + (i / gridSteps) * graphW;
            ctx.moveTo(x, paddingTop);
            ctx.lineTo(x, paddingTop + graphH);

            // Labels
            ctx.setLineDash([]);
            ctx.fillStyle = "#000000";
            ctx.font = "9px sans-serif";
            const val = (i / gridSteps) * maxT;
            ctx.fillText(val.toFixed(1) + "s", x - 10, paddingTop + graphH + 12);
            ctx.setLineDash([2, 4]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Clipping region for data
        ctx.save();
        ctx.beginPath();
        ctx.rect(paddingLeft, paddingTop, graphW, graphH);
        ctx.clip();

        // Apply Pan
        ctx.translate(this.panX, this.panY);

        ctx.strokeStyle = '#000080'; // Win95 Navy Blue for data
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
            const p = data[i];
            const nx = (p[keyX] / maxT) * graphW;
            const px = paddingLeft + nx;
            const ny = ((p[keyY] - minY) / rangeY) * graphH;
            const py = (paddingTop + graphH) - ny;

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }

        ctx.stroke();
        ctx.restore(); // End clipping & pan
        ctx.restore(); // End xOffset/yOffset
    }
}
