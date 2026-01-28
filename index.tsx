import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

// --- Types & Interfaces ---

type GameState = 'START' | 'PLAYING' | 'GAMEOVER';
type EnemyType = 'BASIC' | 'SINE' | 'DIVER' | 'ZIGZAG';
type PowerUpType = 'RAPID_FIRE' | 'SHIELD';

interface Point { x: number; y: number; }

// --- Sound Engine (Synthesized) ---

class SoundEngine {
    ctx: AudioContext | null = null;
    noiseBuffer: AudioBuffer | null = null;

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.noiseBuffer = this.createNoiseBuffer();
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

    private playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
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
        const duration = 0.08;
        const volume = 0.025;
        noiseGain.gain.setValueAtTime(volume, this.ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        noiseSource.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noiseSource.start();
        noiseSource.stop(this.ctx.currentTime + duration);
        this.playTone(880, 'sine', 0.05, 0.01);
    }

    explosion() { this.playTone(60, 'sawtooth', 0.4, 0.08); }
    hit() { this.playTone(150, 'sine', 0.2, 0.05); }
    powerup() { this.playTone(523.25, 'sine', 0.2, 0.05); this.playTone(659.25, 'sine', 0.3, 0.03); }
    bossSpawn() { this.playTone(80, 'sawtooth', 1.0, 0.05); }
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

class PowerUp {
    x: number; y: number; w = 25; h = 25;
    type: PowerUpType;
    constructor(x: number, y: number, type: PowerUpType) {
        this.x = x; this.y = y; this.type = type;
    }
    update() { this.y += 2; }
}

class Enemy {
    x: number; y: number; w: number; h: number; s: number; hue: number;
    type: EnemyType;
    startX: number;
    timer: number = 0;

    constructor(canvasWidth: number, type: EnemyType, speedBase: number) {
        this.type = type;
        this.w = 40; this.h = 40;
        this.startX = Math.random() * (canvasWidth - this.w);
        this.x = this.startX;
        this.y = -50;
        
        switch (type) {
            case 'SINE':
                this.hue = 300; // Purple
                this.s = speedBase * 0.8;
                break;
            case 'DIVER':
                this.hue = 0; // Red
                this.s = speedBase * 0.5;
                break;
            case 'ZIGZAG':
                this.hue = 120; // Green
                this.s = speedBase * 1.2;
                break;
            default:
                this.hue = 200; // Blue
                this.s = speedBase;
        }
    }

    update() {
        this.timer++;
        switch (this.type) {
            case 'SINE':
                this.y += this.s;
                this.x = this.startX + Math.sin(this.timer * 0.05) * 100;
                break;
            case 'DIVER':
                if (this.y < 150) this.y += this.s;
                else this.y += this.s * 4;
                break;
            case 'ZIGZAG':
                this.y += this.s;
                this.x += Math.sin(this.timer * 0.1) * 5;
                break;
            default:
                this.y += this.s;
        }
    }
}

class Boss {
    x: number; y: number; width: number = 180; height: number = 100;
    hp: number; maxHp: number;
    angle: number = 0;
    state: 'ENTRY' | 'PATTERN_1' | 'PATTERN_2' | 'CHARGE' | 'DYING' = 'ENTRY';
    stateTimer: number = 0;
    deathTimer: number = 0;

    constructor(canvasWidth: number, maxHp: number) {
        this.x = canvasWidth / 2 - 90;
        this.y = -150;
        this.hp = maxHp;
        this.maxHp = maxHp;
    }

    update(canvasWidth: number, canvasHeight: number) {
        this.stateTimer++;
        if (this.state === 'ENTRY') {
            if (this.y < 100) this.y += 2;
            else this.state = 'PATTERN_1';
        } else if (this.state === 'PATTERN_1') {
            this.angle += 0.02;
            this.x = (canvasWidth / 2 - 90) + Math.sin(this.angle) * 150;
            if (this.stateTimer > 400) {
                this.state = 'PATTERN_2';
                this.stateTimer = 0;
            }
        } else if (this.state === 'PATTERN_2') {
            this.y = 100 + Math.sin(this.stateTimer * 0.05) * 50;
            this.x += (Math.random() - 0.5) * 10;
            this.x = Math.max(50, Math.min(canvasWidth - this.width - 50, this.x));
            if (this.stateTimer > 300) {
                this.state = 'CHARGE';
                this.stateTimer = 0;
            }
        } else if (this.state === 'CHARGE') {
            if (this.stateTimer < 60) {
                this.y -= 1; // Anticipation
            } else {
                this.y += 12; // Charge!
                if (this.y > canvasHeight + 100) {
                    this.y = -150;
                    this.state = 'ENTRY';
                    this.stateTimer = 0;
                }
            }
        } else if (this.state === 'DYING') {
            this.deathTimer++;
            this.y += 0.5;
            this.x += (Math.random() - 0.5) * 4;
        }
    }
}

// --- Main App Component ---

const App: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<GameState>('START');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(Number(localStorage.getItem('neonHigh') || 0));
    const [lives, setLives] = useState(3);
    const [bossHp, setBossHp] = useState<{current: number, max: number} | null>(null);
    const [isMobile] = useState('ontouchstart' in window);

    // Engine Refs
    const gameData = useRef({
        player: { x: 0, y: 0, w: 40, h: 40, vx: 0, invul: 0, shield: 0, rapidFire: 0 },
        bullets: [] as {x: number, y: number}[],
        bossBullets: [] as {x: number, y: number, vx: number, vy: number}[],
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
        bossCount: 0
    });

    const initStars = (w: number, h: number) => {
        // 3 layers of parallax stars
        gameData.current.stars = Array.from({ length: 150 }, () => {
            const layer = Math.floor(Math.random() * 3); // 0, 1, 2
            return {
                x: Math.random() * w,
                y: Math.random() * h,
                s: layer + 1,
                sp: (layer + 1) * 0.5,
                l: layer
            };
        });
    };

    const startGame = () => {
        sounds.init();
        setGameState('PLAYING');
        setScore(0);
        setLives(3);
        setBossHp(null);
        gameData.current.boss = null;
        gameData.current.enemies = [];
        gameData.current.bullets = [];
        gameData.current.bossBullets = [];
        gameData.current.powerups = [];
        gameData.current.player.invul = 0;
        gameData.current.player.shield = 0;
        gameData.current.player.rapidFire = 0;
        gameData.current.player.vx = 0;
        gameData.current.lastEnemySpawn = performance.now();
        gameData.current.startTime = performance.now();
        gameData.current.bossCount = 0;
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
            gameData.current.player.y = canvas.height - 100;
            initStars(canvas.width, canvas.height);
        };
        resize();
        window.addEventListener('resize', resize);

        const handleInput = () => {
            const { keys, player } = gameData.current;
            if (keys['ArrowLeft'] || keys['KeyA']) player.vx -= 1.5;
            if (keys['ArrowRight'] || keys['KeyD']) player.vx += 1.5;
            if (keys['Space']) fire();
        };

        const fire = () => {
            const now = performance.now();
            const { player } = gameData.current;
            const cooldown = player.rapidFire > 0 ? 80 : 200;
            if (now - gameData.current.lastFire > cooldown) {
                gameData.current.bullets.push({ 
                    x: player.x + 18, 
                    y: player.y 
                });
                gameData.current.lastFire = now;
                sounds.shoot();
            }
        };

        const update = (time: number) => {
            const { player, enemies, bullets, particles, boss, stars, bossBullets, powerups } = gameData.current;
            
            if (gameState === 'PLAYING') {
                handleInput();

                // Dynamic Difficulty Scaling
                const elapsedSeconds = (time - gameData.current.startTime) / 1000;
                const difficultyMultiplier = 1 + (score / 1000) + (elapsedSeconds / 120);
                const enemySpeedBase = 2 * difficultyMultiplier;
                const spawnRate = Math.max(300, 1500 / difficultyMultiplier);

                // Player physics
                player.vx *= 0.9;
                player.x += player.vx;
                player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
                if (player.invul > 0) player.invul--;
                if (player.shield > 0) player.shield--;
                if (player.rapidFire > 0) player.rapidFire--;

                // Stars (Parallax)
                stars.forEach(s => {
                    s.y += s.sp;
                    if (s.y > canvas.height) s.y = 0;
                });

                // Bullets
                bullets.forEach((b, i) => {
                    b.y -= 12;
                    if (b.y < -20) bullets.splice(i, 1);
                });

                // Boss Bullets
                bossBullets.forEach((b, i) => {
                    b.x += b.vx;
                    b.y += b.vy;
                    if (b.y > canvas.height + 20 || b.y < -100 || b.x < -100 || b.x > canvas.width + 100) bossBullets.splice(i, 1);
                    // Collision with player
                    if (player.invul === 0 && b.x > player.x && b.x < player.x + player.w && b.y > player.y && b.y < player.y + player.h) {
                        hitPlayer();
                        bossBullets.splice(i, 1);
                    }
                });

                // Power-ups update
                powerups.forEach((p, i) => {
                    p.update();
                    if (p.y > canvas.height) powerups.splice(i, 1);
                    // Collision
                    if (p.x < player.x + player.w && p.x + p.w > player.x && p.y < player.y + player.h && p.y + p.h > player.y) {
                        sounds.powerup();
                        if (p.type === 'RAPID_FIRE') player.rapidFire = 400;
                        if (p.type === 'SHIELD') player.shield = 400;
                        powerups.splice(i, 1);
                    }
                });

                // Enemy Spawn
                if (!boss && time - gameData.current.lastEnemySpawn > spawnRate) {
                    const rand = Math.random();
                    let type: EnemyType = 'BASIC';
                    if (rand > 0.85) type = 'DIVER';
                    else if (rand > 0.7) type = 'ZIGZAG';
                    else if (rand > 0.5) type = 'SINE';
                    
                    enemies.push(new Enemy(canvas.width, type, enemySpeedBase));
                    gameData.current.lastEnemySpawn = time;
                }

                // Boss Logic
                if (score > 0 && score >= (gameData.current.bossCount + 1) * 800 && !boss) {
                    const bossHP = 80 + (gameData.current.bossCount * 40);
                    gameData.current.boss = new Boss(canvas.width, bossHP);
                    gameData.current.bossCount++;
                    sounds.bossSpawn();
                }

                if (boss) {
                    boss.update(canvas.width, canvas.height);
                    setBossHp({current: boss.hp, max: boss.maxHp});

                    if (boss.state !== 'DYING') {
                        // Boss shooting
                        if (boss.state === 'PATTERN_1' && Math.random() < 0.05) {
                            bossBullets.push({ x: boss.x + boss.width / 2, y: boss.y + boss.height, vx: (Math.random() - 0.5) * 4, vy: 5 });
                        }
                        if (boss.state === 'PATTERN_2' && Math.random() < 0.1) {
                            bossBullets.push({ x: boss.x + Math.random() * boss.width, y: boss.y + boss.height, vx: 0, vy: 7 });
                        }

                        // Boss collision with bullets
                        bullets.forEach((b, bi) => {
                            if (b.x > boss.x && b.x < boss.x + boss.width && b.y > boss.y && b.y < boss.y + boss.height) {
                                boss.hp--;
                                bullets.splice(bi, 1);
                                if (boss.hp <= 0) {
                                    boss.state = 'DYING';
                                    sounds.explosion();
                                }
                            }
                        });

                        // Boss collision with player
                        if (player.invul === 0 && boss.x < player.x + player.w && boss.x + boss.width > player.x && boss.y < player.y + player.h && boss.y + boss.height > player.y) {
                            hitPlayer();
                        }
                    } else {
                        // Boss death animation
                        if (boss.deathTimer % 5 === 0) {
                            particles.push(new Particle(boss.x + Math.random() * boss.width, boss.y + Math.random() * boss.height, '#ff00ea'));
                        }
                        if (boss.deathTimer > 120) {
                            for (let i = 0; i < 40; i++) {
                                particles.push(new Particle(boss.x + boss.width / 2, boss.y + boss.height / 2, '#ff00ea', (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15));
                            }
                            setScore(s => s + 500);
                            gameData.current.boss = null;
                            setBossHp(null);
                        }
                    }
                }

                // Enemies Update
                enemies.forEach((e, i) => {
                    e.update();
                    if (e.y > canvas.height + 50) enemies.splice(i, 1);

                    // Bullet Collision
                    bullets.forEach((b, bi) => {
                        if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
                            enemies.splice(i, 1);
                            bullets.splice(bi, 1);
                            
                            let points = 10;
                            if (e.type === 'SINE') points = 20;
                            if (e.type === 'ZIGZAG') points = 25;
                            if (e.type === 'DIVER') points = 40;
                            setScore(s => s + points);

                            for(let k=0; k<10; k++) particles.push(new Particle(e.x+e.w/2, e.y+e.h/2, `hsl(${e.hue}, 100%, 50%)`));
                            sounds.explosion();

                            // Power-up chance
                            if (Math.random() < 0.15) {
                                const pType: PowerUpType = Math.random() > 0.5 ? 'RAPID_FIRE' : 'SHIELD';
                                powerups.push(new PowerUp(e.x, e.y, pType));
                            }
                        }
                    });

                    // Player Collision
                    if (e.x < player.x + player.w && e.x + e.w > player.x && e.y < player.y + player.h && e.y + e.h > player.y && player.invul === 0) {
                        enemies.splice(i, 1);
                        hitPlayer();
                    }
                });

                // Particles
                particles.forEach((p, i) => {
                    p.update();
                    if (p.life <= 0) particles.splice(i, 1);
                });
            }

            if (gameData.current.shake > 0) gameData.current.shake *= 0.9;
        };

        const hitPlayer = () => {
            const { player } = gameData.current;
            if (player.shield > 0) {
                player.shield = 0;
                player.invul = 60;
                sounds.hit();
                return;
            }
            setLives(l => {
                const next = l - 1;
                if (next <= 0) setGameState('GAMEOVER');
                return next;
            });
            player.invul = 90;
            gameData.current.shake = 30;
            sounds.hit();
        };

        const draw = () => {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const { player, enemies, bullets, particles, boss, stars, shake, bossBullets, powerups } = gameData.current;

            ctx.save();
            if (shake > 0.1) ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake);

            // Stars (Parallax)
            stars.forEach(s => {
                ctx.globalAlpha = (s.l + 1) / 3;
                ctx.fillStyle = '#fff';
                ctx.fillRect(s.x, s.y, s.s, s.s);
            });
            ctx.globalAlpha = 1;

            // Power-ups
            powerups.forEach(p => {
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.type === 'RAPID_FIRE' ? '#00f2ff' : '#ffea00';
                ctx.strokeStyle = ctx.shadowColor;
                ctx.strokeRect(p.x, p.y, p.w, p.h);
                ctx.fillStyle = ctx.shadowColor;
                ctx.font = 'bold 16px Arial';
                ctx.fillText(p.type === 'RAPID_FIRE' ? 'R' : 'S', p.x + 6, p.y + 18);
            });

            // Player
            if (player.invul % 10 < 5) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00f2ff';
                ctx.strokeStyle = '#00f2ff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(player.x + 20, player.y);
                ctx.lineTo(player.x, player.y + 40);
                ctx.lineTo(player.x + 40, player.y + 40);
                ctx.closePath();
                ctx.stroke();

                if (player.shield > 0) {
                    ctx.strokeStyle = '#ffea00';
                    ctx.beginPath();
                    ctx.arc(player.x + 20, player.y + 25, 35, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            // Bullets
            ctx.fillStyle = player.rapidFire > 0 ? '#ff00ea' : '#00f2ff';
            bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 15));

            // Boss Bullets
            ctx.fillStyle = '#ff0044';
            bossBullets.forEach(b => ctx.fillRect(b.x, b.y, 8, 8));

            // Enemies
            enemies.forEach(e => {
                ctx.strokeStyle = `hsl(${e.hue}, 100%, 50%)`;
                ctx.lineWidth = 2;
                ctx.strokeRect(e.x, e.y, e.w, e.h);
                // Detail
                ctx.strokeRect(e.x + 10, e.y + 10, 20, 20);
            });

            // Boss
            if (boss) {
                ctx.shadowBlur = boss.state === 'DYING' ? 30 : 20;
                ctx.shadowColor = boss.state === 'CHARGE' ? '#ff0044' : '#ff00ea';
                ctx.strokeStyle = ctx.shadowColor;
                ctx.lineWidth = 5;
                ctx.strokeRect(boss.x, boss.y, boss.width, boss.height);
                ctx.fillStyle = 'rgba(255, 0, 234, 0.15)';
                ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
                // Engines
                ctx.strokeRect(boss.x + 20, boss.y - 10, 30, 10);
                ctx.strokeRect(boss.x + boss.width - 50, boss.y - 10, 30, 10);
            }

            // Particles
            particles.forEach(p => {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;

            ctx.restore();
            animationFrameId = requestAnimationFrame((t) => {
                update(t);
                draw();
            });
        };

        const onKeyDown = (e: KeyboardEvent) => gameData.current.keys[e.code] = true;
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
    }, [gameState, score]);

    useEffect(() => {
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('neonHigh', score.toString());
        }
    }, [score]);

    const handleMobileInput = (key: string, val: boolean) => {
        gameData.current.keys[key] = val;
        if (key === 'Space' && val) sounds.init();
    };

    return (
        <div style={styles.container}>
            <canvas ref={canvasRef} style={styles.canvas} />

            {/* UI Overlay */}
            <div style={styles.ui}>
                {gameState === 'START' && (
                    <div style={styles.menu}>
                        <h1 style={styles.title}>GALAXY DEFENDER</h1>
                        <p style={styles.subtitle}>NEON STRIKE V2</p>
                        <p style={{color: '#666', fontSize: '1.2rem'}}>High Score: {highScore}</p>
                        <button style={styles.btn} onClick={startGame}>INITIATE</button>
                        <div style={styles.instructions}>
                            WASD/ARROWS: MOVE | SPACE: FIRE
                        </div>
                    </div>
                )}

                {gameState === 'PLAYING' && (
                    <>
                        <div style={styles.hud}>
                            <div>SCORE: {score}</div>
                            <div>LIVES: {lives}</div>
                        </div>
                        {bossHp !== null && (
                            <div style={styles.bossBarContainer}>
                                <div style={{...styles.bossBar, width: `${(bossHp.current / bossHp.max) * 100}%`}} />
                                <div style={styles.bossName}>NEON OVERLORD</div>
                            </div>
                        )}
                        {isMobile && (
                            <div style={styles.mobileControls}>
                                <div style={styles.dpad}>
                                    <button 
                                        onTouchStart={() => handleMobileInput('KeyA', true)} 
                                        onTouchEnd={() => handleMobileInput('KeyA', false)}
                                        style={styles.controlBtn}>L</button>
                                    <button 
                                        onTouchStart={() => handleMobileInput('KeyD', true)} 
                                        onTouchEnd={() => handleMobileInput('KeyD', false)}
                                        style={styles.controlBtn}>R</button>
                                </div>
                                <button 
                                    onTouchStart={() => handleMobileInput('Space', true)} 
                                    onTouchEnd={() => handleMobileInput('Space', false)}
                                    style={styles.fireBtn}>FIRE</button>
                            </div>
                        )}
                    </>
                )}

                {gameState === 'GAMEOVER' && (
                    <div style={styles.menu}>
                        <h1 style={{...styles.title, color: '#ff0044'}}>SYSTEM FAILURE</h1>
                        <p style={{fontSize: '2rem'}}>Score: {score}</p>
                        <button style={{...styles.btn, borderColor: '#ff0044'}} onClick={startGame}>REBOOT</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000' },
    canvas: { display: 'block' },
    ui: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', color: '#fff', textShadow: '0 0 10px #fff' },
    menu: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', pointerEvents: 'auto', background: 'rgba(0,0,0,0.85)' },
    title: { fontSize: '4rem', margin: 0, color: '#00f2ff', letterSpacing: '8px', textAlign: 'center' },
    subtitle: { fontSize: '1.5rem', color: '#ff00ea', marginTop: '-10px', letterSpacing: '4px' },
    instructions: { marginTop: '30px', color: '#888', letterSpacing: '2px' },
    btn: { background: 'none', border: '2px solid #00f2ff', color: '#fff', padding: '15px 40px', fontSize: '1.5rem', cursor: 'pointer', marginTop: '20px', transition: '0.3s' },
    hud: { position: 'absolute', top: 20, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold' },
    bossBarContainer: { position: 'absolute', top: 80, left: '25%', width: '50%', height: '15px', background: '#222', border: '2px solid #ff00ea', borderRadius: '10px', overflow: 'hidden' },
    bossBar: { height: '100%', background: 'linear-gradient(90deg, #ff00ea, #ff0044)', transition: 'width 0.2s ease-out' },
    bossName: { position: 'absolute', width: '100%', textAlign: 'center', top: '-25px', color: '#ff00ea', fontSize: '1.2rem', fontWeight: 'bold' },
    mobileControls: { position: 'absolute', bottom: 40, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', pointerEvents: 'auto' },
    dpad: { display: 'flex', gap: '15px' },
    controlBtn: { width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '2px solid #fff', color: '#fff', fontSize: '1.2rem' },
    fireBtn: { width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(0,242,255,0.2)', border: '3px solid #00f2ff', color: '#fff', fontSize: '1.5rem' }
};

createRoot(document.getElementById('root')!).render(<App />);
