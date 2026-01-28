import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// --- Types & Interfaces ---

type GameState = 'START' | 'PLAYING' | 'BOSS_WARNING' | 'GAMEOVER';

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
        
        // Use noise for a "realistic" crack/gunshot sound
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        
        const noiseGain = this.ctx.createGain();
        const duration = 0.08;
        const volume = 0.025; // Kept low to not be "noisy"

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

        // Add a small metallic "ping" for sci-fi feel
        this.playTone(880, 'sine', 0.05, 0.01);
    }

    explosion() { this.playTone(60, 'sawtooth', 0.4, 0.08); }
    hit() { this.playTone(150, 'sine', 0.2, 0.05); }
    bossSpawn() { this.playTone(80, 'sawtooth', 1.0, 0.05); }
}

const sounds = new SoundEngine();

// --- Game Entities ---

class Particle {
    x: number; y: number; vx: number; vy: number;
    life: number = 1.0;
    color: string;
    constructor(x: number, y: number, color: string) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.color = color;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= 0.02; }
}

class Boss {
    x: number; y: number; width: number = 120; height: number = 80;
    hp: number = 50; maxHp: number = 50;
    direction: number = 1;
    angle: number = 0;
    constructor(canvasWidth: number) {
        this.x = canvasWidth / 2 - 60;
        this.y = -100;
    }
    update(canvasWidth: number) {
        if (this.y < 100) this.y += 2;
        this.angle += 0.02;
        this.x += Math.sin(this.angle) * 3;
    }
}

// --- Main App Component ---

const App: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<GameState>('START');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(Number(localStorage.getItem('neonHigh') || 0));
    const [lives, setLives] = useState(3);
    const [bossHp, setBossHp] = useState<number | null>(null);
    const [isMobile, setIsMobile] = useState('ontouchstart' in window);

    // Engine Refs
    const gameData = useRef({
        player: { x: 0, y: 0, w: 40, h: 40, vx: 0, invul: 0 },
        bullets: [] as {x: number, y: number}[],
        bossBullets: [] as {x: number, y: number}[],
        enemies: [] as {x: number, y: number, w: number, h: number, s: number, hue: number}[],
        particles: [] as Particle[],
        stars: [] as {x: number, y: number, s: number, sp: number}[],
        boss: null as Boss | null,
        shake: 0,
        keys: {} as Record<string, boolean>,
        lastFire: 0,
        lastEnemySpawn: 0
    });

    const initStars = (w: number, h: number) => {
        gameData.current.stars = Array.from({ length: 100 }, () => ({
            x: Math.random() * w, y: Math.random() * h, s: Math.random() * 2, sp: Math.random() * 0.5 + 0.1
        }));
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
        gameData.current.player.invul = 0;
        gameData.current.lastEnemySpawn = performance.now();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        let animationFrameId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gameData.current.player.x = canvas.width / 2;
            gameData.current.player.y = canvas.height - 80;
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
            if (now - gameData.current.lastFire > 200) {
                gameData.current.bullets.push({ 
                    x: gameData.current.player.x + 18, 
                    y: gameData.current.player.y 
                });
                gameData.current.lastFire = now;
                sounds.shoot();
            }
        };

        const update = (time: number) => {
            const { player, enemies, bullets, particles, boss, stars, bossBullets } = gameData.current;
            
            if (gameState === 'PLAYING') {
                handleInput();

                // Player physics
                player.vx *= 0.9;
                player.x += player.vx;
                player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
                if (player.invul > 0) player.invul--;

                // Stars
                stars.forEach(s => {
                    s.y += s.sp;
                    if (s.y > canvas.height) s.y = 0;
                });

                // Bullets
                bullets.forEach((b, i) => {
                    b.y -= 10;
                    if (b.y < -20) bullets.splice(i, 1);
                });

                // Boss Bullets
                bossBullets.forEach((b, i) => {
                    b.y += 5;
                    if (b.y > canvas.height) bossBullets.splice(i, 1);
                    // Collision with player
                    if (b.x > player.x && b.x < player.x + player.w && b.y > player.y && b.y < player.y + player.h && player.invul === 0) {
                        hitPlayer();
                        bossBullets.splice(i, 1);
                    }
                });

                // Enemy Spawn
                if (!boss && time - gameData.current.lastEnemySpawn > Math.max(400, 1500 - score / 2)) {
                    enemies.push({
                        x: Math.random() * (canvas.width - 40),
                        y: -50, w: 40, h: 40,
                        s: 2 + Math.random() * 3,
                        hue: Math.random() * 360
                    });
                    gameData.current.lastEnemySpawn = time;
                }

                // Boss Logic
                if (score > 0 && score % 500 === 0 && !boss) {
                    gameData.current.boss = new Boss(canvas.width);
                    sounds.bossSpawn();
                }

                if (boss) {
                    boss.update(canvas.width);
                    setBossHp(boss.hp);
                    if (Math.random() < 0.02) {
                        bossBullets.push({ x: boss.x + boss.width/2, y: boss.y + boss.height });
                    }
                    // Boss collision with bullets
                    bullets.forEach((b, bi) => {
                        if (b.x > boss.x && b.x < boss.x + boss.width && b.y > boss.y && b.y < boss.y + boss.height) {
                            boss.hp--;
                            bullets.splice(bi, 1);
                            if (boss.hp <= 0) {
                                sounds.explosion();
                                gameData.current.boss = null;
                                setScore(s => s + 200);
                                setBossHp(null);
                            }
                        }
                    });
                }

                // Enemies Update
                enemies.forEach((e, i) => {
                    e.y += e.s;
                    if (e.y > canvas.height) enemies.splice(i, 1);

                    // Bullet Collision
                    bullets.forEach((b, bi) => {
                        if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
                            enemies.splice(i, 1);
                            bullets.splice(bi, 1);
                            setScore(s => s + 10);
                            for(let k=0; k<10; k++) particles.push(new Particle(e.x+e.w/2, e.y+e.h/2, `hsl(${e.hue}, 100%, 50%)`));
                            sounds.explosion();
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
            setLives(l => {
                const next = l - 1;
                if (next <= 0) setGameState('GAMEOVER');
                return next;
            });
            gameData.current.player.invul = 60;
            gameData.current.shake = 20;
            sounds.hit();
        };

        const draw = () => {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const { player, enemies, bullets, particles, boss, stars, shake, bossBullets } = gameData.current;

            ctx.save();
            if (shake > 0.1) ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake);

            // Stars
            ctx.fillStyle = '#fff';
            stars.forEach(s => {
                ctx.globalAlpha = s.sp;
                ctx.fillRect(s.x, s.y, s.s, s.s);
            });
            ctx.globalAlpha = 1;

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
            }

            // Bullets
            ctx.fillStyle = '#00f2ff';
            bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 15));

            // Boss Bullets
            ctx.fillStyle = '#ff0044';
            bossBullets.forEach(b => ctx.fillRect(b.x, b.y, 8, 8));

            // Enemies
            enemies.forEach(e => {
                ctx.strokeStyle = `hsl(${e.hue}, 100%, 50%)`;
                ctx.strokeRect(e.x, e.y, e.w, e.h);
            });

            // Boss
            if (boss) {
                ctx.strokeStyle = '#ff00ea';
                ctx.lineWidth = 5;
                ctx.strokeRect(boss.x, boss.y, boss.width, boss.height);
                ctx.fillStyle = 'rgba(255, 0, 234, 0.2)';
                ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
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
        if (key === 'Space' && val) sounds.init(); // Init audio on first touch
    };

    return (
        <div style={styles.container}>
            <canvas ref={canvasRef} style={styles.canvas} />

            {/* UI Overlay */}
            <div style={styles.ui}>
                {gameState === 'START' && (
                    <div style={styles.menu}>
                        <h1 style={styles.title}>GALAXY DEFENDER</h1>
                        <p style={styles.subtitle}>NEON STRIKE</p>
                        <p style={{color: '#666'}}>High Score: {highScore}</p>
                        <button style={styles.btn} onClick={startGame}>INITIATE</button>
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
                                <div style={{...styles.bossBar, width: `${(bossHp / 50) * 100}%`}} />
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
                        <p>Score: {score}</p>
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
    menu: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', pointerEvents: 'auto', background: 'rgba(0,0,0,0.8)' },
    title: { fontSize: '4rem', margin: 0, color: '#00f2ff', letterSpacing: '8px' },
    subtitle: { fontSize: '1.5rem', color: '#ff00ea', marginTop: '-10px', letterSpacing: '4px' },
    btn: { background: 'none', border: '2px solid #00f2ff', color: '#fff', padding: '15px 40px', fontSize: '1.5rem', cursor: 'pointer', marginTop: '20px', transition: '0.3s' },
    hud: { position: 'absolute', top: 20, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem' },
    bossBarContainer: { position: 'absolute', top: 60, left: '20%', width: '60%', height: '10px', background: '#222', border: '1px solid #ff00ea' },
    bossBar: { height: '100%', background: '#ff00ea', transition: 'width 0.1s linear' },
    mobileControls: { position: 'absolute', bottom: 40, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', pointerEvents: 'auto' },
    dpad: { display: 'flex', gap: '10px' },
    controlBtn: { width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '2px solid #fff', color: '#fff', fontSize: '1.2rem' },
    fireBtn: { width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(0,242,255,0.2)', border: '3px solid #00f2ff', color: '#fff', fontSize: '1.5rem' }
};

createRoot(document.getElementById('root')!).render(<App />);