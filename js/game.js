export class Game {
    constructor() {
        this.score = 0;
        this.targetDist = 0;
        this.targetWidth = 2; // meters
        this.isActive = false;

        // Stats
        this.lastRange = 0;
        this.lastHeight = 0;
        this.lastTime = 0;
    }

    startChallenge(minDist = 30, maxDist = 90) {
        this.isActive = true;
        this.score = 0;
        this.spawnTarget(minDist, maxDist);
        return { targetDist: this.targetDist, score: this.score };
    }

    spawnTarget(minDist, maxDist) {
        this.targetDist = Math.floor(Math.random() * (maxDist - minDist + 1)) + minDist;
    }

    checkCollision(projectile) {
        // Simple ground collision check
        if (projectile.y <= 0 && projectile.time > 0.1) {
            // Check if hit target
            const hit = Math.abs(projectile.x - this.targetDist) <= (this.targetWidth / 2);
            return {
                hit: hit,
                ground: true
            };
        }
        return { hit: false, ground: false };
    }

    updateScore(hit) {
        if (hit) {
            this.score += 10;
            // Move target for next round if challenge mode is active
            if (this.isActive) {
                // Keep target for a moment or move immediately? 
                // Let's keep it simple: hit -> score up -> new target
                this.spawnTarget(20, 100);
            }
        }
        return this.score;
    }
}
