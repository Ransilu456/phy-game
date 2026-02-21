export class Game {
    constructor() {
        this.score = 0;
        this.targetDist = 0;
        this.targetBaseY = 0;
        this.targetWidth = 3; // meters
        this.isActive = false;
        this.challengeType = 'normal'; // 'normal', 'high_altitude', 'precision'

        // Stats
        this.lastRange = 0;
        this.lastHeight = 0;
        this.lastTime = 0;
    }

    startChallenge() {
        this.isActive = true;

        // Randomize challenge type
        const types = ['normal', 'high_altitude', 'precision'];
        this.challengeType = types[Math.floor(Math.random() * types.length)];

        this.spawnTarget();
        return {
            targetDist: this.targetDist,
            targetY: this.targetBaseY,
            score: this.score,
            description: this.getChallengeDescription()
        };
    }

    spawnTarget() {
        // Distance mostly between 30 and 120m
        this.targetDist = Math.floor(Math.random() * 90) + 30;

        if (this.challengeType === 'high_altitude') {
            this.targetBaseY = Math.floor(Math.random() * 15) + 10;
            this.targetWidth = 4;
        } else if (this.challengeType === 'precision') {
            this.targetBaseY = 0;
            this.targetWidth = 1.5;
        } else {
            this.targetBaseY = 0;
            this.targetWidth = 3;
        }
    }

    getChallengeDescription() {
        switch (this.challengeType) {
            case 'high_altitude':
                return `Intercept the target at ${this.targetBaseY}m altitude!`;
            case 'precision':
                return `Precision Strike! Hit the tiny ${this.targetWidth}m target at ${this.targetDist}m.`;
            default:
                return `Hit the target at ${this.targetDist}m.`;
        }
    }

    checkCollision(projectile) {
        // Collision with target area
        const distToTarget = Math.sqrt(
            Math.pow(projectile.x - this.targetDist, 2) +
            Math.pow(projectile.y - this.targetBaseY, 2)
        );

        const hit = distToTarget <= (this.targetWidth / 2);

        // Ground or out of bounds
        const ground = (projectile.y <= 0 && projectile.time > 0.1) || (projectile.y < this.targetBaseY - 5);

        return { hit, ground };
    }

    updateScore(hit) {
        if (hit) {
            this.score += (this.challengeType === 'precision' ? 20 : 10);
            if (this.isActive) this.startChallenge(); // New target
        }
        return this.score;
    }
}
