import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

// --- Types & Interfaces ---

type GameState = 'START' | 'PLAYING' | 'GAMEOVER' | 'SHOP';
type EnemyType = 'BASIC' | 'SINE' | 'DIVER' | 'ZIGZAG' | 'SCOUT';
type PowerUpType = 'RAPID_FIRE' | 'SHIELD' | 'TRIPLE_SHOT' | 'HEAL';

interface Upgrades {
    damage: number;
    fireRate: number;
    speed: number;
    maxHealth: number;
}

// --- Sound Engine (Synthesized) ---

class SoundEngine {
    ctx: AudioContext | null = null;
    noiseBuffer: AudioBuffer | null = null;

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.noiseBuffer = this.createNoiseBuffer();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    private createNoiseBuffer() {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    private playTone(freq: number, type: OscillatorType, duration: number, volume: number, decay = true) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        if (decay) {
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        }
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    shoot() {
        if (!this.ctx || !this.noiseBuffer) return;
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        noiseSource.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noiseSource.start();
        this.playTone(880, 'sine', 0.08, 0.01);
    }

    explosion() {
        if (!this.ctx || !this.noiseBuffer) return;
        this.playTone(60, 'sawtooth', 0.5, 0.1);
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
        noiseSource.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noiseSource.start();
    }

    hit() { 
        this.playTone(120, 'square', 0.15, 0.03); 
    }
    
    powerup() { 
        this.playTone(440, 'sine', 0.1, 0.04, false);
        this.playTone(660, 'sine', 0.15, 0.03, true);
    }
}

const sounds = new SoundEngine();

// --- Game Entities ---

class Particle {
    x: number; y: number; vx: number; vy: number;
    life: number = 1.0;
    color: string;
    constructor(x: number, y: number, color: string, vx?: number, vy?: number) {
        this.x = x; this.y = y;
        this.vx = vx ?? (Math.random() - 0.5) * 6;
        this.vy = vy ?? (Math.random() - 0.5) * 6;
        this.color = color;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= 0.02; }
}

class Projectile {
    x: number; y: number; vx: number; vy: number; 
    w: number = 4; h: number = 12;
    fromEnemy: boolean;
    constructor(x: number, y: number, vx: number, vy: number, fromEnemy = false) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.fromEnemy = fromEnemy;
    }
    update() { this.x += this.vx; this.y += this.vy; }
}

class PowerUp {
    x: number; y: number; w = 30; h = 30;
    type: PowerUpType;
    pulse: number = 0;
    constructor(x: number, y: number, type: PowerUpType) {
        this.x = x; this.y = y; this.type = type;
    }
    update() {
        this.y += 1.8;
        this.pulse += 0.1;
    }
}

class Enemy {
    x: number; y: number; w: number; h: number; s: number; hue: number;
    type: EnemyType;
    startX: number;
    timer: number = 0;
    hp: number;
    canShoot: boolean = false;
    shootRate: number = 0.005;

    constructor(canvasWidth: number, type: EnemyType, speedBase: number) {
        this.type = type;
        this.w = 40; this.h = 40;
        this.startX = Math.random() * (canvasWidth - this.w);
        this.x = this.startX;
        this.y = -50;
        this.hp = 1;
        
        switch (type) {
            case 'SINE': this.hue = 300; this.s = speedBase * 0.9; this.canShoot = true; break;
            case 'DIVER': this.hue = 0; this.s = speedBase * 0.6; this.hp = 3; break;
            case 'ZIGZAG': this.hue = 120; this.s = speedBase * 1.3; break;
            case 'SCOUT': this.hue = 40; this.s = speedBase * 1.5; this.canShoot = true; this.shootRate = 0.01; break;
            default: this.hue = 200; this.s = speedBase;
        }
    }

    update(canvasWidth: number) {
        this.timer++;
        switch (this.type) {
            case 'SINE':
                this.y += this.s;
                this.x = this.startX + Math.sin(this.timer * 0.04) * 120;
                break;
            case 'DIVER':
                if (this.y < 250) this.y += this.s;
                else this.y += this.s * 4.5;
                break;
            case 'ZIGZAG':
                this.y += this.s;
                this.x += Math.sin(this.timer * 0.15) * 10;
                break;
            case 'SCOUT':
                this.y += this.s;
                if (this.timer % 100 < 50) this.x += 2.5; else this.x -= 2.5;
                break;
            default:
                this.y += this.s;
        }
        this.x = Math.max(0, Math.min(canvasWidth - this.w, this.x));
    }
}

class Boss {
    x: number; y: number; width: number = 220; height: number = 140;
    hp: number; maxHp: number;
    angle: number = 0;
    state: 'ENTRY' | 'SPIRAL' | 'HOMING' | 'CHARGE' | 'DYING' = 'ENTRY';
    stateTimer: number = 0;
    deathTimer: number = 0;

    constructor(canvasWidth: number, maxHp: number) {
        this.x = canvasWidth / 2 - 110;
        this.y = -200;
        this.hp = maxHp;
        this.maxHp = maxHp;
    }

    update(canvasWidth: number, canvasHeight: number) {
        this.stateTimer++;
        if (this.state === 'ENTRY') {
            if (this.y < 120) this.y += 2;
            else this.state = 'SPIRAL';
        } else if (this.state === 'SPIRAL') {
            this.angle += 0.03;
            this.x = (canvasWidth / 2 - 110) + Math.sin(this.angle) * 200;
            if (this.stateTimer > 450) { this.state = 'HOMING'; this.stateTimer = 0; }
        } else if (this.state === 'HOMING') {
            this.y = 120 + Math.sin(this.stateTimer * 0.04) * 60;
            this.x += (Math.random() - 0.5) * 20;
            this.x = Math.max(50, Math.min(canvasWidth - this.width - 50, this.x));
            if (this.stateTimer > 350) { this.state = 'CHARGE'; this.stateTimer = 0; }
        } else if (this.state === 'CHARGE') {
            if (this.stateTimer < 60) this.y -= 2;
            else {
                this.y += 22;
                if (this.y > canvasHeight + 150) {
                    this.y = -250;
                    this.state = 'ENTRY';
                    this.stateTimer = 0;
                }
            }
        } else if (this.state === 'DYING') {
            this.deathTimer++;
            this.y += 0.4;
            this.x += (Math.random() - 0.5) * 8;
        }
    }
}

// --- Main App Component ---

const App: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<GameState>('START');
    const [isPaused, setIsPaused] = useState(false);
    const [score, setScore] = useState(0);
    const [coins, setCoins] = useState(0);
    const [highScore, setHighScore] = useState(Number(localStorage.getItem('neonHigh') || 0));
    const [health, setHealth] = useState(100);
    const [wave, setWave] = useState(1);
    const [bossHp, setBossHp] = useState<{current: number, max: number} | null>(null);
    const [isMobile] = useState('ontouchstart' in window || navigator.maxTouchPoints > 0);

    const [upgrades, setUpgrades] = useState<Upgrades>({
        damage: 1,
        fireRate: 1,
        speed: 1,
        maxHealth: 100
    });

    const gameData = useRef({
        player: { x: 0, y: 0, w: 40, h: 40, vx: 0, invul: 0, shield: 0, rapidFire: 0, tripleShot: 0 },
        bullets: [] as Projectile[],
        enemyBullets: [] as Projectile[],
        enemies: [] as Enemy[],
        powerups: [] as PowerUp[],
        particles: [] as Particle[],
        stars: [] as {x: number, y: number, s: number, sp: number, l: number}[],
        boss: null as Boss | null,
        shake: 0,
        keys: {} as Record<string, boolean>,
        lastFire: 0,
        lastEnemySpawn: 0,
        startTime: 0,
        enemiesDefeated: 0,
        shotsFired: 0,
        shotsHit: 0,
    });

    const initStars = (w: number, h: number) => {
        gameData.current.stars = Array.from({ length: 200 }, () => {
            const layer = Math.floor(Math.random() * 3);
            return {
                x: Math.random() * w,
                y: Math.random() * h,
                s: layer + 1,
                sp: (layer + 1) * 0.7,
                l: layer
            };
        });
    };

    const startGame = () => {
        sounds.init();
        const now = performance.now();
        setGameState('PLAYING');
        setIsPaused(false);
        setScore(0);
        setCoins(0);
        setHealth(upgrades.maxHealth);
        setWave(1);
        setBossHp(null);
        gameData.current.boss = null;
        gameData.current.enemies = [];
        gameData.current.bullets = [];
        gameData.current.enemyBullets = [];
        gameData.current.powerups = [];
        gameData.current.particles = [];
        gameData.current.player.invul = 0;
        gameData.current.player.shield = 0;
        gameData.current.player.rapidFire = 0;
        gameData.current.player.tripleShot = 0;
        gameData.current.player.vx = 0;
        gameData.current.startTime = now;
        gameData.current.lastEnemySpawn = now;
        gameData.current.enemiesDefeated = 0;
        gameData.current.shotsFired = 0;
        gameData.current.shotsHit = 0;
    };

    const fire = () => {
        const now = performance.now();
        const { player } = gameData.current;
        const cooldown = (player.rapidFire > 0 ? 80 : 250) / (1 + (upgrades.fireRate * 0.2));
        if (now - gameData.current.lastFire > cooldown) {
            gameData.current.shotsFired++;
            const px = player.x + 18;
            const py = player.y;
            if (player.tripleShot > 0) {
                gameData.current.bullets.push(new Projectile(px, py, 0, -15));
                gameData.current.bullets.push(new Projectile(px, py, -4, -14));
                gameData.current.bullets.push(new Projectile(px, py, 4, -14));
            } else {
                gameData.current.bullets.push(new Projectile(px, py, 0, -15));
            }
            gameData.current.lastFire = now;
            sounds.shoot();
        }
    };

    const takeDamage = (amt: number) => {
        const { player } = gameData.current;
        if (player.shield > 0) { player.shield = 0; player.invul = 40; sounds.hit(); return; }
        setHealth(h => {
            const next = h - amt;
            if (next <= 0) { setGameState('GAMEOVER'); sounds.explosion(); return 0; }
            return next;
        });
        player.invul = 80;
        gameData.current.shake = 25;
        sounds.hit();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        let animationFrameId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gameData.current.player.x = canvas.width / 2 - 20;
            gameData.current.player.y = canvas.height - 120;
            initStars(canvas.width, canvas.height);
        };
        resize();
        window.addEventListener('resize', resize);

        const update = (time: number) => {
            if (isPaused || gameState !== 'PLAYING') return;

            const { player, enemies, bullets, particles, boss, stars, enemyBullets, powerups, keys } = gameData.current;

            // Handle Input
            const speed = 1.8 + (upgrades.speed * 0.3);
            if (keys['ArrowLeft'] || keys['KeyA']) player.vx -= speed;
            if (keys['ArrowRight'] || keys['KeyD']) player.vx += speed;
            if (keys['Space']) fire();

            const elapsed = (time - gameData.current.startTime) / 1000;
            const diffMult = 1 + (wave * 0.25) + (elapsed / 240);
            const enemySpeed = 2.4 * diffMult;
            const spawnRate = Math.max(250, 1800 / diffMult);

            if (gameData.current.enemiesDefeated >= wave * 15 && !boss) {
                const bossHP = 150 + (wave * 100);
                gameData.current.boss = new Boss(canvas.width, bossHP);
                sounds.init();
            }

            player.vx *= 0.86;
            player.x += player.vx;
            player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
            if (player.invul > 0) player.invul--;
            if (player.shield > 0) player.shield--;
            if (player.rapidFire > 0) player.rapidFire--;
            if (player.tripleShot > 0) player.tripleShot--;

            stars.forEach(s => { s.y += s.sp; if (s.y > canvas.height) s.y = 0; });

            // Using backward loops for safe splicing
            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].update();
                if (bullets[i].y < -50 || bullets[i].x < -50 || bullets[i].x > canvas.width + 50) {
                    bullets.splice(i, 1);
                }
            }

            for (let i = enemyBullets.length - 1; i >= 0; i--) {
                enemyBullets[i].update();
                const b = enemyBullets[i];
                if (b.y > canvas.height + 50 || b.y < -250 || b.x < -250 || b.x > canvas.width + 250) {
                    enemyBullets.splice(i, 1);
                    continue;
                }
                if (player.invul === 0 && b.x > player.x && b.x < player.x + player.w && b.y > player.y && b.y < player.y + player.h) {
                    takeDamage(15);
                    enemyBullets.splice(i, 1);
                }
            }

            for (let i = powerups.length - 1; i >= 0; i--) {
                const p = powerups[i];
                p.update();
                if (p.y > canvas.height) {
                    powerups.splice(i, 1);
                    continue;
                }
                if (p.x < player.x + player.w && p.x + p.w > player.x && p.y < player.y + player.h && p.y + p.h > player.y) {
                    sounds.powerup();
                    if (p.type === 'RAPID_FIRE') player.rapidFire = 600;
                    if (p.type === 'SHIELD') player.shield = 600;
                    if (p.type === 'TRIPLE_SHOT') player.tripleShot = 600;
                    if (p.type === 'HEAL') setHealth(h => Math.min(upgrades.maxHealth, h + 30));
                    powerups.splice(i, 1);
                }
            }

            if (!boss && time - gameData.current.lastEnemySpawn > spawnRate) {
                const r = Math.random();
                let type: EnemyType = 'BASIC';
                if (r > 0.9) type = 'DIVER';
                else if (r > 0.75) type = 'SCOUT';
                else if (r > 0.6) type = 'ZIGZAG';
                else if (r > 0.4) type = 'SINE';
                enemies.push(new Enemy(canvas.width, type, enemySpeed));
                gameData.current.lastEnemySpawn = time;
            }

            if (boss) {
                boss.update(canvas.width, canvas.height);
                setBossHp({ current: boss.hp, max: boss.maxHp });
                if (boss.state !== 'DYING') {
                    if (boss.state === 'SPIRAL' && boss.stateTimer % 12 === 0) {
                        const a = boss.stateTimer * 0.15;
                        enemyBullets.push(new Projectile(boss.x + boss.width / 2, boss.y + boss.height, Math.cos(a) * 5, Math.sin(a) * 5 + 3, true));
                    }
                    if (boss.state === 'HOMING' && boss.stateTimer % 50 === 0) {
                        const dx = (player.x + 20) - (boss.x + boss.width / 2);
                        const dy = (player.y + 20) - (boss.y + boss.height);
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        enemyBullets.push(new Projectile(boss.x + boss.width / 2, boss.y + boss.height, (dx / dist) * 8, (dy / dist) * 8, true));
                    }
                    for (let bi = bullets.length - 1; bi >= 0; bi--) {
                        const b = bullets[bi];
                        if (b.x > boss.x && b.x < boss.x + boss.width && b.y > boss.y && b.y < boss.y + boss.height) {
                            boss.hp -= upgrades.damage;
                            gameData.current.shotsHit++;
                            bullets.splice(bi, 1);
                            if (boss.hp <= 0) {
                                boss.state = 'DYING';
                                gameData.current.shake = 30;
                                sounds.explosion();
                            }
                        }
                    }
                    if (player.invul === 0 && boss.x < player.x + player.w && boss.x + boss.width > player.x && boss.y < player.y + player.h && boss.y + boss.height > player.y) {
                        takeDamage(25);
                    }
                } else {
                    if (boss.deathTimer % 5 === 0) {
                        particles.push(new Particle(boss.x + Math.random() * boss.width, boss.y + Math.random() * boss.height, '#ff00ea'));
                        if (boss.deathTimer % 15 === 0) sounds.explosion();
                    }
                    if (boss.deathTimer > 180) {
                        setScore(s => s + 2000);
                        setCoins(c => c + 150);
                        setWave(w => w + 1);
                        gameData.current.enemiesDefeated = 0;
                        gameData.current.boss = null;
                        setBossHp(null);
                        setGameState('SHOP');
                    }
                }
            }

            for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];
                e.update(canvas.width);
                if (e.canShoot && Math.random() < e.shootRate * diffMult) {
                    enemyBullets.push(new Projectile(e.x + 20, e.y + 40, 0, 7, true));
                }
                if (e.y > canvas.height + 60) {
                    enemies.splice(i, 1);
                    continue;
                }
                for (let bi = bullets.length - 1; bi >= 0; bi--) {
                    const b = bullets[bi];
                    if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
                        e.hp -= upgrades.damage;
                        gameData.current.shotsHit++;
                        bullets.splice(bi, 1);
                        if (e.hp <= 0) {
                            enemies.splice(i, 1);
                            gameData.current.enemiesDefeated++;
                            setScore(s => s + 50);
                            setCoins(c => c + 10);
                            for (let k = 0; k < 10; k++) particles.push(new Particle(e.x + 20, e.y + 20, `hsl(${e.hue}, 100%, 50%)`));
                            sounds.explosion();
                            if (Math.random() < 0.18) {
                                const types: PowerUpType[] = ['RAPID_FIRE', 'SHIELD', 'TRIPLE_SHOT', 'HEAL'];
                                powerups.push(new PowerUp(e.x, e.y, types[Math.floor(Math.random() * types.length)]));
                            }
                        } else {
                            sounds.hit();
                        }
                    }
                }
                if (e.x < player.x + player.w && e.x + e.w > player.x && e.y < player.y + player.h && e.y + e.h > player.y && player.invul === 0) {
                    enemies.splice(i, 1);
                    takeDamage(20);
                }
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                if (particles[i].life <= 0) particles.splice(i, 1);
            }
            if (gameData.current.shake > 0) gameData.current.shake *= 0.92;
        };

        const draw = () => {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const { player, enemies, bullets, particles, boss, stars, shake, enemyBullets, powerups } = gameData.current;

            ctx.save();
            if (shake > 0.1) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

            stars.forEach(s => { ctx.globalAlpha = (s.l + 1) / 4; ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.s, s.s); });
            ctx.globalAlpha = 1;

            powerups.forEach(p => {
                const s = 1 + Math.sin(p.pulse) * 0.2;
                ctx.strokeStyle = p.type === 'RAPID_FIRE' ? '#ff00ea' : p.type === 'SHIELD' ? '#ffea00' : p.type === 'TRIPLE_SHOT' ? '#00f2ff' : '#00ff00';
                ctx.lineWidth = 3;
                ctx.strokeRect(p.x + (p.w - p.w * s) / 2, p.y + (p.h - p.h * s) / 2, p.w * s, p.h * s);
                ctx.fillStyle = ctx.strokeStyle;
                ctx.font = 'bold 18px Arial';
                ctx.fillText(p.type[0], p.x + 8, p.y + 22);
            });

            if (player.invul % 10 < 5) {
                ctx.strokeStyle = '#00f2ff';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(player.x + 20, player.y);
                ctx.lineTo(player.x - 5, player.y + 45);
                ctx.lineTo(player.x + 45, player.y + 45);
                ctx.closePath();
                ctx.stroke();
                if (player.shield > 0) {
                    ctx.strokeStyle = '#ffea00';
                    ctx.setLineDash([10, 5]);
                    ctx.beginPath(); ctx.arc(player.x + 20, player.y + 28, 45, 0, Math.PI * 2); ctx.stroke();
                    ctx.setLineDash([]);
                }
            }

            ctx.fillStyle = player.rapidFire > 0 ? '#ff00ea' : '#00f2ff';
            bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
            ctx.fillStyle = '#ff0044';
            enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, 6, 6));

            enemies.forEach(e => {
                ctx.strokeStyle = `hsl(${e.hue}, 100%, 50%)`;
                ctx.lineWidth = 3;
                if (e.type === 'DIVER') {
                    ctx.beginPath(); ctx.moveTo(e.x + 20, e.y); ctx.lineTo(e.x + 40, e.y + 40); ctx.lineTo(e.x, e.y + 40); ctx.closePath(); ctx.stroke();
                } else if (e.type === 'SCOUT') {
                    ctx.strokeRect(e.x + 5, e.y + 10, 30, 20);
                    ctx.strokeRect(e.x + 15, e.y, 10, 10);
                } else {
                    ctx.strokeRect(e.x, e.y, e.w, e.h);
                }
            });

            if (boss) {
                ctx.strokeStyle = boss.state === 'CHARGE' ? '#ff0044' : '#ff00ea';
                ctx.lineWidth = 6;
                ctx.strokeRect(boss.x, boss.y, boss.width, boss.height);
                ctx.fillStyle = 'rgba(255, 0, 234, 0.05)';
                ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
                ctx.strokeRect(boss.x - 15, boss.y + 20, 15, 60); ctx.strokeRect(boss.x + boss.width, boss.y + 20, 15, 60);
            }

            particles.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill(); });
            ctx.globalAlpha = 1;
            ctx.restore();

            animationFrameId = requestAnimationFrame((t) => { update(t); draw(); });
        };

        const onKeyDown = (e: KeyboardEvent) => {
            gameData.current.keys[e.code] = true;
            if (e.code === 'KeyP' && gameState === 'PLAYING') setIsPaused(p => !p);
        };
        const onKeyUp = (e: KeyboardEvent) => gameData.current.keys[e.code] = false;
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        draw();
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('resize', resize);
        };
    }, [gameState, isPaused, upgrades]);

    const buyUpgrade = (key: keyof Upgrades) => {
        let cost = 0;
        if (key === 'maxHealth') {
            cost = Math.floor((upgrades.maxHealth / 20) * 50);
        } else {
            cost = upgrades[key] * 50;
        }

        if (coins >= cost) {
            setCoins(c => c - cost);
            setUpgrades(prev => {
                const newVal = prev[key] + (key === 'maxHealth' ? 20 : 1);
                return { ...prev, [key]: newVal };
            });
            sounds.powerup();
        }
    };

    const accuracy = gameData.current.shotsFired > 0 
        ? Math.round((gameData.current.shotsHit / gameData.current.shotsFired) * 100) 
        : 0;

    return (
        <div style={styles.container}>
            <canvas ref={canvasRef} style={styles.canvas} />

            <div style={styles.ui}>
                {gameState === 'START' && (
                    <div style={styles.menuOverlay}>
                        <h1 style={styles.title}>GALAXY DEFENDER</h1>
                        <p style={styles.subtitle}>NEON STRIKE RECHARGED</p>
                        <p style={styles.statLine}>HIGH SCORE: {highScore}</p>
                        <button style={styles.btn} onClick={startGame}>INITIALIZE</button>
                        <div style={styles.hint}>[WASD] MOVE &bull; [SPACE] FIRE &bull; [P] PAUSE</div>
                    </div>
                )}

                {gameState === 'PLAYING' && (
                    <>
                        <div style={styles.hudTop}>
                            <div style={styles.hudGroup}>
                                <div style={styles.hudLabel}>SCORE</div>
                                <div style={styles.hudValue}>{score}</div>
                            </div>
                            <div style={styles.hudGroup}>
                                <div style={styles.hudLabel}>WAVE</div>
                                <div style={styles.hudValue}>{wave}</div>
                            </div>
                            <div style={styles.hudGroup}>
                                <div style={styles.hudLabel}>COINS</div>
                                <div style={styles.hudValue}>{coins}</div>
                            </div>
                        </div>

                        <div style={styles.healthBarContainer}>
                            <div style={{...styles.healthBarInner, width: `${Math.max(0, (health / upgrades.maxHealth) * 100)}%`}} />
                            <div style={styles.healthBarText}>HULL STABILITY</div>
                        </div>

                        <div style={styles.powerupStatus}>
                            {gameData.current.player.rapidFire > 0 && <div style={{color:'#ff00ea'}}>RAPID FIRE</div>}
                            {gameData.current.player.tripleShot > 0 && <div style={{color:'#00f2ff'}}>TRIPLE SHOT</div>}
                            {gameData.current.player.shield > 0 && <div style={{color:'#ffea00'}}>SHIELD</div>}
                        </div>

                        {isPaused && (
                            <div style={styles.blurOverlay}>
                                <h2 style={styles.pauseTitle}>SYSTEMS PAUSED</h2>
                                <p style={styles.statLine}>PRESS 'P' TO RESUME</p>
                            </div>
                        )}

                        {bossHp && (
                            <div style={styles.bossBarContainer}>
                                <div style={styles.bossLabel}>BOSS INTEGRITY</div>
                                <div style={styles.bossBarOuter}>
                                    <div style={{...styles.bossBarInner, width: `${(bossHp.current / bossHp.max) * 100}%`}} />
                                </div>
                            </div>
                        )}

                        {isMobile && (
                            <div style={styles.mobileControls}>
                                <div style={styles.dpad}>
                                    <button style={styles.dpadBtn} 
                                        onTouchStart={() => gameData.current.keys['ArrowLeft'] = true}
                                        onTouchEnd={() => gameData.current.keys['ArrowLeft'] = false}
                                    >←</button>
                                    <button style={styles.dpadBtn}
                                        onTouchStart={() => gameData.current.keys['ArrowRight'] = true}
                                        onTouchEnd={() => gameData.current.keys['ArrowRight'] = false}
                                    >→</button>
                                </div>
                                <button style={styles.fireBtn}
                                    onTouchStart={() => gameData.current.keys['Space'] = true}
                                    onTouchEnd={() => gameData.current.keys['Space'] = false}
                                >FIRE</button>
                            </div>
                        )}
                    </>
                )}

                {gameState === 'SHOP' && (
                    <div style={styles.menuOverlay}>
                        <h1 style={styles.title}>COMMAND CENTER</h1>
                        <p style={{color: '#00f2ff', fontSize: '1.2rem', marginBottom: '10px'}}>WAVE {wave-1} CLEARED</p>
                        <div style={styles.statsPanel}>
                            <p>CURRENT COINS: {coins}</p>
                            <p>LAST WAVE ACCURACY: {accuracy}%</p>
                        </div>
                        <div style={styles.shopGrid}>
                            <ShopItem label="WEAPON DAMAGE" val={upgrades.damage} cost={upgrades.damage*50} onBuy={() => buyUpgrade('damage')} />
                            <ShopItem label="FIRE RATE" val={upgrades.fireRate} cost={upgrades.fireRate*50} onBuy={() => buyUpgrade('fireRate')} />
                            <ShopItem label="THRUSTER SPEED" val={upgrades.speed} cost={upgrades.speed*50} onBuy={() => buyUpgrade('speed')} />
                            <ShopItem label="MAX HULL" val={upgrades.maxHealth} cost={Math.floor((upgrades.maxHealth/20)*50)} onBuy={() => buyUpgrade('maxHealth')} />
                        </div>
                        <button style={styles.btn} onClick={() => { setGameState('PLAYING'); setHealth(upgrades.maxHealth); }}>NEXT WAVE</button>
                    </div>
                )}

                {gameState === 'GAMEOVER' && (
                    <div style={styles.menuOverlay}>
                        <h1 style={{...styles.title, color: '#ff0044'}}>MISSION FAILED</h1>
                        <div style={styles.statsPanel}>
                            <p>FINAL SCORE: {score}</p>
                            <p>WAVES COMPLETED: {wave - 1}</p>
                            <p>TOTAL ACCURACY: {accuracy}%</p>
                        </div>
                        <button style={{...styles.btn, borderColor: '#ff0044', color: '#ff0044'}} onClick={startGame}>RESTART MISSION</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ShopItem = ({ label, val, cost, onBuy }: any) => (
    <div style={styles.shopItem}>
        <div style={styles.shopLabel}>{label}</div>
        <div style={styles.shopValue}>LEVEL {val}</div>
        <button style={styles.buyBtn} onClick={onBuy}>UPGRADE ({cost}C)</button>
    </div>
);

const styles: Record<string, React.CSSProperties> = {
    container: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000' },
    canvas: { display: 'block' },
    ui: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', color: '#fff' },
    menuOverlay: { 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%', 
        pointerEvents: 'auto', 
        background: 'rgba(5,5,5,0.6)', 
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        transition: 'background 0.3s'
    },
    title: { fontSize: '4rem', margin: '0 0 10px 0', color: '#00f2ff', letterSpacing: '8px', textAlign: 'center', fontWeight: 800 },
    subtitle: { fontSize: '1.2rem', color: '#ff00ea', marginTop: '-10px', letterSpacing: '4px', marginBottom: '20px', fontWeight: 400 },
    statLine: { color: '#ccc', marginBottom: '20px', letterSpacing: '1px' },
    hint: { marginTop: '40px', color: '#999', fontSize: '0.8rem', letterSpacing: '2px' },
    btn: { background: 'none', border: '2px solid #00f2ff', color: '#fff', padding: '12px 40px', fontSize: '1.4rem', cursor: 'pointer', marginTop: '20px', fontWeight: 600, transition: 'all 0.2s', pointerEvents: 'auto' },
    hudTop: { position: 'absolute', top: 25, left: 25, right: 25, display: 'flex', justifyContent: 'space-between' },
    hudGroup: { textAlign: 'center' },
    hudLabel: { fontSize: '0.7rem', color: '#aaa', letterSpacing: '2px' },
    hudValue: { fontSize: '1.8rem', fontWeight: 700, color: '#00f2ff' },
    healthBarContainer: { position: 'absolute', bottom: 35, left: '50%', transform: 'translateX(-50%)', width: '300px', height: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(0,242,255,0.4)', borderRadius: '10px', overflow: 'hidden' },
    healthBarInner: { height: '100%', background: 'linear-gradient(90deg, #00f2ff, #00ffaa)', transition: 'width 0.3s ease' },
    healthBarText: { position: 'absolute', width: '100%', textAlign: 'center', top: '-22px', color: '#00f2ff', fontSize: '0.7rem', letterSpacing: '2px', opacity: 0.9 },
    powerupStatus: { position: 'absolute', top: 120, left: 25, display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 500, fontSize: '0.9rem' },
    blurOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)', pointerEvents: 'auto' },
    pauseTitle: { fontSize: '2.5rem', color: '#ffea00', fontWeight: 700, marginBottom: '10px' },
    bossBarContainer: { position: 'absolute', top: 100, left: '25%', width: '50%' },
    bossLabel: { color: '#ff00ea', fontSize: '0.7rem', textAlign: 'center', marginBottom: '5px', letterSpacing: '3px', opacity: 0.9 },
    bossBarOuter: { height: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,0,234,0.4)', borderRadius: '10px', overflow: 'hidden' },
    bossBarInner: { height: '100%', background: 'linear-gradient(90deg, #ff00ea, #ff0044)', transition: 'width 0.2s linear' },
    shopGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', margin: '20px 0', width: '90%', maxWidth: '750px' },
    shopItem: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', padding: '15px', textAlign: 'center', borderRadius: '4px' },
    shopLabel: { color: '#ccc', fontSize: '0.7rem', letterSpacing: '1px' },
    shopValue: { fontSize: '1.1rem', margin: '8px 0', color: '#00f2ff', fontWeight: 600 },
    buyBtn: { background: 'rgba(0,242,255,0.2)', border: '1px solid #00f2ff', color: '#fff', padding: '8px 14px', fontWeight: 600, cursor: 'pointer', borderRadius: '2px', fontSize: '0.8rem', transition: '0.2s', pointerEvents: 'auto' },
    statsPanel: { margin: '15px 0', color: '#ddd', textAlign: 'center', fontSize: '0.9rem' },
    mobileControls: { position: 'absolute', bottom: 30, left: 0, width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 30px', boxSizing: 'border-box', pointerEvents: 'auto' },
    dpad: { display: 'flex', gap: '20px' },
    dpadBtn: { width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(0,242,255,0.5)', color: '#fff', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    fireBtn: { width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,0,234,0.2)', border: '3px solid #ff00ea', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }
};

createRoot(document.getElementById('root')!).render(<App />);
