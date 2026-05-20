const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size based on window size
const CANVAS_WIDTH = Math.min(window.innerWidth * 0.9, 800);
const CANVAS_HEIGHT = Math.min(window.innerHeight * 0.8, 600);
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Game states
const GAME_STATE = {
    START: 'START',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER'
};
let currentState = GAME_STATE.START;

// Game variables
let score = 0;
let level = 1;
let stars = 0; // Total stars collected across game
let starsCollectedCurrentLevel = 0; // Stars for current level progression
let frame = 0;
let animationFrameId;

// Player variables
let player = {
    x: canvas.width / 2,
    y: canvas.height - 60,
    width: 30,
    height: 30,
    speed: 5,
    defaultSpeed: 5, // Store default speed for power-up reset
    speedPowerUpTimer: 0, // Timer for speed power-up duration
    bulletPowerUpTimer: 0, // Timer for bullet power-up duration
    invulnerableDuration: 0 // Duration for invulnerability after hit
};
const PLAYER_BULLET_COOLDOWN = 20; // Frames between shots
let playerBulletTimer = 0;

// Bullet variables
let bullets = [];
let bulletSpeed = 7;
let bulletDamage = 1; // Default bullet damage
const MAX_BULLETS = 10;

// Asteroid variables
let asteroids = [];
let asteroidSpawnInterval = 100; // Frames between asteroid spawns
let asteroidTimer = 0;
let bossAsteroid = null;
let bossHitCount = 0;
let bossTargetIndex = 0; // Index for boss movement pattern

// Power-up variables
let powerUps = [];
const POWER_UP_DURATION_FRAMES = 60 * 20; // 20 seconds duration for power-ups
const POWER_UP_SPAWN_CHANCE = 0.05; // 5% chance after asteroid destruction
const POWER_UP_TYPE = {
    SPEED: 'SPEED',
    BULLET: 'BULLET'
};

// Star variables
let collectedStars = [];
let starsToSpawn = 0;

// Keyboard input
let keys = {
    ArrowLeft: false,
    ArrowRight: false,
    KeyA: false,
    KeyD: false,
    Space: false
};

// Mobile touch input states
let isMovingLeft = false;
let isMovingRight = false;
let isShooting = false;

// Tone.js Sound Synthesizers
const pewSynth = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.1 }
}).toDestination();

const crashNoise = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 }
}).toDestination();

const levelUpSynth = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0, release: 0.05 }
}).toDestination();

const gameOverSynth = new Tone.Synth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.05, decay: 0.3, sustain: 0.0, release: 0.5 }
}).toDestination();

// Level star requirements
const LEVEL_STAR_REQUIREMENTS = {
    1: 20, 2: 20, 3: 20, 4: 20, 5: 20,
    6: 40, 7: 40, 8: 40, 9: 40, 10: 40,
    11: 55, 12: 55, 13: 55, 14: 55, 15: 55,
    16: 70, 17: 70, 18: 70, 19: 70, 20: 70,
    21: 100, 22: 100, 23: 100, 24: 100
    // Level 25 is boss level, handled separately
};

// --- Game Utility Functions ---

function playPew() {
    pewSynth.triggerAttackRelease("C5", "8n");
}

function playCrash() {
    crashNoise.triggerAttackRelease("4n");
}

function playLevelUpJingle() {
    levelUpSynth.triggerAttackRelease("C5", "0.1");
    setTimeout(() => levelUpSynth.triggerAttackRelease("E5", "0.1"), 100);
    setTimeout(() => levelUpSynth.triggerAttackRelease("G5", "0.1"), 200);
}

function playGameOverJingle() {
    gameOverSynth.triggerAttackRelease("C4", "0.2");
    setTimeout(() => gameOverSynth.triggerAttackRelease("A3", "0.2"), 250);
    setTimeout(() => gameOverSynth.triggerAttackRelease("F3", "0.4"), 500);
}

function showTempMessage(message, type = 'info') {
    const msgElement = document.getElementById('powerUpMessage');
    msgElement.textContent = message;
    msgElement.className = 'power-up-message show';
    msgElement.style.backgroundColor = (type === 'success')
        ? 'rgba(0, 255, 0, 0.8)'
        : 'rgba(0, 255, 255, 0.8)';
    setTimeout(() => {
        msgElement.className = 'power-up-message';
    }, 1500);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// --- Game Object Classes ---

class Player {
    constructor(x, y, width, height, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.defaultSpeed = speed;
        this.speedPowerUpTimer = 0;
        this.bulletPowerUpTimer = 0;
        this.invulnerableDuration = 0;
        this.isInvulnerable = false;
    }
    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 2, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y - this.height / 2);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
        ctx.closePath();
        ctx.fillStyle = this.isInvulnerable && frame % 10 < 5 ? '#FFD700' : '#00ffff';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
    update() {
        if (keys.ArrowLeft || keys.KeyA || isMovingLeft) this.x -= this.speed;
        if (keys.ArrowRight || keys.KeyD || isMovingRight) this.x += this.speed;
        if (this.x < this.width / 2) this.x = this.width / 2;
        if (this.x > canvas.width - this.width / 2) this.x = canvas.width - this.width / 2;
        if (this.speedPowerUpTimer > 0) {
            this.speedPowerUpTimer--;
            if (this.speedPowerUpTimer === 0) {
                this.speed = this.defaultSpeed;
                showTempMessage('Speed power-up expired!', 'info');
            }
        }
        if (this.bulletPowerUpTimer > 0) {
            this.bulletPowerUpTimer--;
            if (this.bulletPowerUpTimer === 0) {
                bulletDamage = 1;
                showTempMessage('Bullet power-up expired!', 'info');
            }
        }
        if (this.invulnerableDuration > 0) {
            this.invulnerableDuration--;
            this.isInvulnerable = true;
            if (this.invulnerableDuration === 0) this.isInvulnerable = false;
        }
    }
    applyPowerUp(type) {
        if (type === POWER_UP_TYPE.SPEED) {
            this.speedPowerUpTimer = POWER_UP_DURATION_FRAMES;
            this.speed += 2;
            showTempMessage('Speed Boost!', 'success');
        } else if (type === POWER_UP_TYPE.BULLET) {
            this.bulletPowerUpTimer = POWER_UP_DURATION_FRAMES;
            bulletDamage++;
            showTempMessage('Bullet Power Up!', 'success');
        }
    }
    makeInvulnerable() {
        this.invulnerableDuration = 60 * 2;
    }
}

class Bullet {
    constructor(x, y, speed, damage) {
        this.x = x;
        this.y = y;
        this.radius = 3;
        this.speed = speed;
        this.damage = damage;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = player.bulletPowerUpTimer > 0 ? '#8A2BE2' : '#ff0000';
        ctx.fill();
    }
    update() {
        this.y -= this.speed;
    }
}

class Asteroid {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = getRandomInt(1, 3);
        switch (this.size) {
            case 'small':
                this.radius = getRandomInt(10, 15);
                this.health = 1;
                this.value = 10;
                break;
            case 'medium':
                this.radius = getRandomInt(18, 25);
                this.health = 2;
                this.value = 25;
                break;
            case 'large':
                this.radius = getRandomInt(30, 40);
                this.health = 3;
                this.value = 50;
                break;
            case 'boss':
                this.radius = 70;
                this.health = 50;
                this.value = 500;
                this.speed = 1.5;
                break;
        }
        this.maxHealth = this.health;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#808080';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (this.maxHealth > 1 && this.size !== 'boss') {
            const barWidth = this.radius * 1.5;
            const barHeight = 5;
            const healthRatio = this.health / this.maxHealth;
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x - barWidth / 2, this.y + this.radius + 5, barWidth, barHeight);
            ctx.fillStyle = 'lime';
            ctx.fillRect(this.x - barWidth / 2, this.y + this.radius + 5, barWidth * healthRatio, barHeight);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x - barWidth / 2, this.y + this.radius + 5, barWidth, barHeight);
        }
        if (this.size === 'boss') {
            const barWidth = this.radius * 2;
            const barHeight = 10;
            const healthRatio = this.health / this.maxHealth;
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 15, barWidth, barHeight);
            ctx.fillStyle = 'lime';
            ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 15, barWidth * healthRatio, barHeight);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x - barWidth / 2, this.y - this.radius - 15, barWidth, barHeight);
            ctx.fillStyle = 'white';
            ctx.font = '16px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(`BOSS HEALTH: ${this.health}`, this.x, this.y - this.radius - 20);
        }
    }
    update() {
        if (this.size !== 'boss') {
            this.y += this.speed;
        } else {
            const speed = this.speed;
            const targets = [
                { x: canvas.width * 0.2, y: canvas.height * 0.7 },
                { x: canvas.width / 2, y: canvas.height * 0.1 },
                { x: canvas.width * 0.8, y: canvas.height * 0.7 },
                { x: canvas.width / 2, y: canvas.height * 0.1 }
            ];
            let target = targets[bossTargetIndex];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > speed) {
                this.x += (dx / dist) * speed;
                this.y += (dy / dist) * speed;
            } else {
                this.x = target.x;
                this.y = target.y;
                let nextTargetIndex;
                let consecutiveCount = 0;
                do {
                    nextTargetIndex = getRandomInt(0, targets.length - 1);
                    const currentTargetSide = bossTargetIndex === 0 ? 'left' : (bossTargetIndex === 2 ? 'right' : 'none');
                    const nextTargetSide = nextTargetIndex === 0 ? 'left' : (nextTargetIndex === 2 ? 'right' : 'none');
                    if (currentTargetSide !== 'none' && nextTargetSide === currentTargetSide) {
                        consecutiveCount++;
                    } else {
                        consecutiveCount = 0;
                    }
                } while (consecutiveCount >= 2);
                bossTargetIndex = nextTargetIndex;
            }
        }
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.type = type;
        this.speed = 1.5;
    }
    draw() {
        ctx.beginPath();
        ctx.rect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        ctx.fillStyle = this.type === POWER_UP_TYPE.SPEED ? '#00FF00' : '#FFD700';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type === POWER_UP_TYPE.SPEED ? 'S' : 'B', this.x, this.y);
    }
    update() {
        this.y += this.speed;
    }
}

class Star {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.speed = 1.5;
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(
                Math.cos((18 + i * 72) * Math.PI / 180) * this.radius,
                -Math.sin((18 + i * 72) * Math.PI / 180) * this.radius
            );
            ctx.lineTo(
                Math.cos((54 + i * 72) * Math.PI / 180) * (this.radius / 2.5),
                -Math.sin((54 + i * 72) * Math.PI / 180) * (this.radius / 2.5)
            );
        }
        ctx.closePath();
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }
    update() {
        this.y += this.speed;
    }
}

// --- Game Logic Functions ---

function resetGame() {
    score = 0;
    level = 1;
    stars = 0;
    starsCollectedCurrentLevel = 0;
    frame = 0;
    player.x = canvas.width / 2;
    player.y = canvas.height - 60;
    player.speed = player.defaultSpeed;
    player.speedPowerUpTimer = 0;
    player.bulletPowerUpTimer = 0;
    player.invulnerableDuration = 0;
    player.isInvulnerable = false;
    bulletDamage = 1;
    bullets = [];
    asteroids = [];
    powerUps = [];
    collectedStars = [];
    asteroidTimer = 0;
    bossAsteroid = null;
    bossHitCount = 0;
    bossTargetIndex = 0;
    starsToSpawn = 0;
    updateUI();
}

function updateUI() {
    document.getElementById('scoreDisplay').textContent = `SCORE: ${score}`;
    document.getElementById('levelDisplay').textContent = `LEVEL: ${level}`;
    document.getElementById('starsDisplay').textContent = `STARS: ${stars}`;
}

function spawnAsteroid() {
    const x = getRandomInt(player.width / 2, canvas.width - player.width / 2);
    const y = -50;
    let asteroidType;
    if (level >= 1 && level <= 5) {
        asteroidType = 'small';
    } else if (level >= 6 && level <= 15) {
        asteroidType = Math.random() < 0.7 ? 'small' : 'medium';
    } else if (level >= 16 && level <= 24) {
        const rand = Math.random();
        if (rand < 0.5) asteroidType = 'small';
        else if (rand < 0.85) asteroidType = 'medium';
        else asteroidType = 'large';
    } else {
        return;
    }
    asteroids.push(new Asteroid(x, y, asteroidType));
}

function spawnPowerUp(x, y) {
    if (Math.random() < POWER_UP_SPAWN_CHANCE) {
        const type = Math.random() < 0.5 ? POWER_UP_TYPE.SPEED : POWER_UP_TYPE.BULLET;
        powerUps.push(new PowerUp(x, y, type));
    }
}

function spawnStars(x, y, count) {
    for (let i = 0; i < count; i++) {
        const offsetX = getRandomInt(-20, 20);
        const offsetY = getRandomInt(-20, 20);
        collectedStars.push(new Star(x + offsetX, y + offsetY));
    }
}

function handleCollisions() {
    // Bullet-Asteroid collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = asteroids.length - 1; j >= 0; j--) {
            const bullet = bullets[i];
            const asteroid = asteroids[j];
            if (distance(bullet.x, bullet.y, asteroid.x, asteroid.y) < bullet.radius + asteroid.radius) {
                asteroid.health -= bullet.damage;
                bullets.splice(i, 1);
                score += 1;
                if (asteroid.health <= 0) {
                    score += asteroid.value;
                    spawnPowerUp(asteroid.x, asteroid.y);
                    spawnStars(asteroid.x, asteroid.y, getRandomInt(1, 2));
                    asteroids.splice(j, 1);
                }
                break;
            }
        }
    }
    // Player-Asteroid collisions
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        const playerLeft = player.x - player.width / 2;
        const playerRight = player.x + player.width / 2;
        const playerTop = player.y - player.height / 2;
        const playerBottom = player.y + player.height / 2;
        if (
            playerRight < asteroid.x - asteroid.radius ||
            playerLeft > asteroid.x + asteroid.radius ||
            playerBottom < asteroid.y - asteroid.radius ||
            playerTop > asteroid.y + asteroid.radius
        ) {
            continue;
        }
        let testX = asteroid.x;
        let testY = asteroid.y;
        if (asteroid.x < playerLeft) testX = playerLeft;
        else if (asteroid.x > playerRight) testX = playerRight;
        if (asteroid.y < playerTop) testY = playerTop;
        else if (asteroid.y > playerBottom) testY = playerBottom;
        const distX = asteroid.x - testX;
        const distY = asteroid.y - testY;
        const distanceSquared = (distX * distX) + (distY * distY);
        if (distanceSquared < (asteroid.radius * asteroid.radius)) {
            if (!player.isInvulnerable) {
                currentState = GAME_STATE.GAME_OVER;
                playCrash();
            }
            asteroids.splice(i, 1);
            break;
        }
    }
    // Player-PowerUp collisions
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        if (distance(player.x, player.y, powerUp.x, powerUp.y) < player.width / 2 + powerUp.radius) {
            player.applyPowerUp(powerUp.type);
            powerUps.splice(i, 1);
        }
    }
    // Player-Star collisions
    for (let i = collectedStars.length - 1; i >= 0; i--) {
        const star = collectedStars[i];
        if (distance(player.x, player.y, star.x, star.y) < player.width / 2 + star.radius) {
            stars++;
            starsCollectedCurrentLevel++;
            collectedStars.splice(i, 1);
        }
    }
}

function checkLevelProgression() {
    if (level < 25) {
        const requiredStars = LEVEL_STAR_REQUIREMENTS[level];
        if (starsCollectedCurrentLevel >= requiredStars) {
            level++;
            starsCollectedCurrentLevel = 0;
            showTempMessage(`Level ${level} Reached!`, 'info');
            playLevelUpJingle();
            asteroidSpawnInterval = Math.max(30, 100 - (level * 3));
        }
    } else if (level === 25) {
        if (!bossAsteroid) {
            bossAsteroid = new Asteroid(canvas.width / 2, canvas.height * 0.1, 'boss');
            asteroids.push(bossAsteroid);
            showTempMessage('BOSS APPROACHING!', 'success');
        }
        if (bossAsteroid && bossAsteroid.health <= 0) {
            showTempMessage('BOSS DEFEATED!', 'success');
            stars += 10;
            level++;
            bossAsteroid = null;
            bossHitCount = 0;
            asteroids = [];
            showTempMessage(`Level ${level} Reached! (Game continues)`, 'info');
            asteroidSpawnInterval = 40;
            starsCollectedCurrentLevel = 0;
        }
    }
}

function animate() {
    animationFrameId = requestAnimationFrame(animate);
    if (currentState === GAME_STATE.PLAYING) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        frame++;
        player.update();
        player.draw();
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            bullet.update();
            bullet.draw();
            if (bullet.y < 0) bullets.splice(i, 1);
        }
        if (level < 25 || (level === 25 && bossAsteroid === null) || level > 25) {
            asteroidTimer++;
            if (asteroidTimer >= asteroidSpawnInterval) {
                spawnAsteroid();
                asteroidTimer = 0;
            }
        }
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const asteroid = asteroids[i];
            asteroid.update();
            asteroid.draw();
            if (asteroid.y > canvas.height + asteroid.radius) {
                asteroids.splice(i, 1);
            }
        }
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const powerUp = powerUps[i];
            powerUp.update();
            powerUp.draw();
            if (powerUp.y > canvas.height + powerUp.radius) {
                powerUps.splice(i, 1);
            }
        }
        for (let i = collectedStars.length - 1; i >= 0; i--) {
            const star = collectedStars[i];
            star.update();
            star.draw();
            if (star.y > canvas.height + star.radius) {
                collectedStars.splice(i, 1);
            }
        }
        playerBulletTimer++;
        if ((keys.Space || isShooting) && playerBulletTimer >= PLAYER_BULLET_COOLDOWN && bullets.length < MAX_BULLETS) {
            bullets.push(new Bullet(player.x, player.y - player.height / 2, bulletSpeed, bulletDamage));
            playPew();
            playerBulletTimer = 0;
        }
        handleCollisions();
        checkLevelProgression();
        updateUI();
        if (currentState === GAME_STATE.GAME_OVER) {
            playGameOverJingle();
            cancelAnimationFrame(animationFrameId);
            document.getElementById('finalScore').textContent = score;
            document.getElementById('finalStars').textContent = stars;
            document.getElementById('gameOverScreen').classList.remove('hidden');
        }
    }
}

// --- Event Listeners ---

window.addEventListener('keydown', (e) => {
    if (e.code in keys) keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
    if (e.code in keys) keys[e.code] = false;
});

// Mobile Touch Events
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const shootButton = document.getElementById('shootButton');

if (leftButton) {
    leftButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isMovingLeft = true;
    }, { passive: false });
    leftButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        isMovingLeft = false;
    });
    leftButton.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        isMovingLeft = false;
    });
}
if (rightButton) {
    rightButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isMovingRight = true;
    }, { passive: false });
    rightButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        isMovingRight = false;
    });
    rightButton.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        isMovingRight = false;
    });
}
if (shootButton) {
    shootButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isShooting = true;
    }, { passive: false });
    shootButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        isShooting = false;
    });
    shootButton.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        isShooting = false;
    });
}

// Start button
document.getElementById('startButton').addEventListener('click', async () => {
    await Tone.start();
    currentState = GAME_STATE.PLAYING;
    document.getElementById('startScreen').classList.add('hidden');
    const mobileControlsDiv = document.getElementById('mobileControls');
    if (mobileControlsDiv) mobileControlsDiv.style.pointerEvents = 'auto';
    resetGame();
    player = new Player(canvas.width / 2, canvas.height - 60, 30, 30, 5);
    animate();
});

// Restart button
document.getElementById('restartButton').addEventListener('click', async () => {
    await Tone.start();
    currentState = GAME_STATE.PLAYING;
    document.getElementById('gameOverScreen').classList.add('hidden');
    const mobileControlsDiv = document.getElementById('mobileControls');
    if (mobileControlsDiv) mobileControlsDiv.style.pointerEvents = 'auto';
    resetGame();
    player = new Player(canvas.width / 2, canvas.height - 60, 30, 30, 5);
    animate();
});

// Initial setup
window.onload = function() {
    window.addEventListener('resize', () => {
        canvas.width = Math.min(window.innerWidth * 0.9, 800);
        canvas.height = Math.min(window.innerHeight * 0.8, 600);
        if (currentState === GAME_STATE.START || currentState === GAME_STATE.GAME_OVER) {
            player.x = canvas.width / 2;
            player.y = canvas.height - 60;
        }
        if (currentState !== GAME_STATE.PLAYING) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            player.draw();
        }
    });
    player = new Player(canvas.width / 2, canvas.height - 60, 30, 30, 5);
    updateUI();
    const mobileControlsDiv = document.getElementById('mobileControls');
    if (mobileControlsDiv) mobileControlsDiv.style.pointerEvents = 'none';
};