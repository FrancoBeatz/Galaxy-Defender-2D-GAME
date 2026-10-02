import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, ShipClass, DifficultyMode, Upgrades, GameSettings, PlayerStats, FloatingText, PowerUpType } from './types/game';
import { sounds } from './audio/SoundEngine';
import { Player } from './game/entities/Player';
import { Enemy } from './game/entities/Enemy';
import { Boss } from './game/entities/Boss';
import { Projectile } from './game/entities/Projectile';
import { PowerUp } from './game/entities/PowerUp';
import { ParticleSystem } from './game/entities/ParticleSystem';
import { Starfield } from './game/entities/Starfield';

import { CockpitHUD } from './components/ui/CockpitHUD';
import { StartMenu } from './components/ui/StartMenu';
import { PauseModal } from './components/ui/PauseModal';
import { GameOverModal } from './components/ui/GameOverModal';
import { HangarShopModal } from './components/ui/HangarShopModal';
import { SettingsModal } from './components/ui/SettingsModal';
import { TouchControls } from './components/ui/TouchControls';
import { DecryptedText } from './components/ui/DecryptedText';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // High level UI game state
  const [gameState, setGameState] = useState<GameState>('START');
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return Number(localStorage.getItem('galaxy_high_score') || 0);
  });
  const [credits, setCredits] = useState<number>(() => {
    return Number(localStorage.getItem('galaxy_credits') || 0);
  });
  const [wave, setWave] = useState(1);
  const [isNewHigh, setIsNewHigh] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [waveBanner, setWaveBanner] = useState<string | null>(null);

  // Combo system
  const [combo, setCombo] = useState(1);
  const [comboTimer, setComboTimer] = useState(0);

  // Settings
  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('galaxy_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return {
      masterVolume: 0.8,
      sfxVolume: 0.8,
      musicVolume: 0.4,
      screenShake: true,
      reducedMotion: false,
      controlMode: 'KEYBOARD',
      touchSensitivity: 1.0
    };
  });

  // Upgrades
  const [upgrades, setUpgrades] = useState<Upgrades>({
    damage: 1,
    fireRate: 1,
    speed: 1,
    maxHealth: 100,
    maxShield: 50,
    empCapacitor: 1,
    magnetRange: 60
  });

  const [stats, setStats] = useState<PlayerStats>({
    enemiesDefeated: 0,
    shotsFired: 0,
    shotsHit: 0,
    bossesKilled: 0,
    powerupsCollected: 0,
    maxCombo: 1,
    score: 0,
    credits: 0,
    wave: 1,
    timeSurvivedSeconds: 0
  });

  const isMobile = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Real-time engine reference for high frequency 60fps data
  const engine = useRef({
    player: new Player(800, 600, 'AEGIS'),
    enemies: [] as Enemy[],
    boss: null as Boss | null,
    projectiles: [] as Projectile[],
    enemyProjectiles: [] as Projectile[],
    powerups: [] as PowerUp[],
    particles: new ParticleSystem(),
    starfield: new Starfield(),
    floatingTexts: [] as FloatingText[],
    keys: {} as Record<string, boolean>,
    touchMovement: { x: 0, y: 0, isFiring: false },
    lastFireTime: 0,
    lastSpawnTime: 0,
    gameStartTime: 0,
    screenShake: 0,
    waveEnemiesDefeated: 0,
    difficulty: 'NORMAL' as DifficultyMode,
    comboMultiplier: 1,
    comboTimer: 0,
  });

  // Handle settings update
  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('galaxy_settings', JSON.stringify(updated));
      sounds.setVolumes(updated.masterVolume, updated.sfxVolume, updated.musicVolume);
      return updated;
    });
  };

  const handleToggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  // Start new game session
  const startGame = (shipClass: ShipClass = 'AEGIS', difficulty: DifficultyMode = 'NORMAL') => {
    sounds.init();
    sounds.startMusic();

    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : window.innerWidth;
    const h = canvas ? canvas.height : window.innerHeight;

    engine.current.player = new Player(w, h, shipClass);
    engine.current.player.maxHp = upgrades.maxHealth;
    engine.current.player.hp = upgrades.maxHealth;
    engine.current.player.maxShield = upgrades.maxShield;
    engine.current.player.shield = upgrades.maxShield;

    engine.current.enemies = [];
    engine.current.boss = null;
    engine.current.projectiles = [];
    engine.current.enemyProjectiles = [];
    engine.current.powerups = [];
    engine.current.particles.clear();
    engine.current.floatingTexts = [];
    engine.current.waveEnemiesDefeated = 0;
    engine.current.difficulty = difficulty;
    engine.current.comboMultiplier = 1;
    engine.current.comboTimer = 0;
    engine.current.gameStartTime = performance.now();
    engine.current.lastFireTime = 0;
    engine.current.lastSpawnTime = performance.now();

    setScore(0);
    setWave(1);
    setIsNewHigh(false);
    setIsPaused(false);
    setGameState('PLAYING');

    setWaveBanner('SECTOR 01 // ORBITAL DEFENSE INITIATED');
    setTimeout(() => setWaveBanner(null), 3000);

    setStats({
      enemiesDefeated: 0,
      shotsFired: 0,
      shotsHit: 0,
      bossesKilled: 0,
      powerupsCollected: 0,
      maxCombo: 1,
      score: 0,
      credits: 0,
      wave: 1,
      timeSurvivedSeconds: 0
    });
  };

  // EMP Super-Bomb Screen Wipe
  const triggerEMP = useCallback(() => {
    const { player, enemies, enemyProjectiles, particles } = engine.current;
    if (player.empCharge < 100) return;

    player.empCharge = 0;
    sounds.empBomb();
    if (settings.screenShake && !settings.reducedMotion) {
      engine.current.screenShake = 35;
    }

    // Clear all enemy bullets into spark particles
    enemyProjectiles.forEach(b => {
      particles.emitExplosion(b.x, b.y, '#f97316', 8, 0.6);
    });
    engine.current.enemyProjectiles = [];

    // Damage all on-screen enemies
    enemies.forEach(e => {
      e.takeDamage(20 + upgrades.damage * 5);
      particles.emitExplosion(e.x + e.w / 2, e.y + e.h / 2, '#38bdf8', 16, 1.2);
    });

    if (engine.current.boss) {
      engine.current.boss.takeDamage(50 + upgrades.damage * 10);
    }
  }, [upgrades.damage, settings.screenShake, settings.reducedMotion]);

  // Handle Player Firing
  const handleFire = () => {
    const now = performance.now();
    const { player, projectiles } = engine.current;

    const baseCooldown = player.rapidFireTimer > 0 ? 85 : 220;
    const cooldown = baseCooldown / (1 + upgrades.fireRate * 0.2);

    if (now - engine.current.lastFireTime < cooldown) return;
    engine.current.lastFireTime = now;
    setStats(s => ({ ...s, shotsFired: s.shotsFired + 1 }));

    const px = player.x + player.w / 2;
    const py = player.y;

    if (player.photonBeamTimer > 0) {
      projectiles.push(new Projectile(px, py - 30, 0, -22, 'BEAM', false, 3 + upgrades.damage));
      sounds.laserShoot('BEAM');
    } else if (player.spreadShotTimer > 0) {
      projectiles.push(new Projectile(px, py - 10, 0, -16, 'SPREAD', false, 1.5 + upgrades.damage * 0.5));
      projectiles.push(new Projectile(px - 10, py - 10, -4, -15, 'SPREAD', false, 1.5 + upgrades.damage * 0.5));
      projectiles.push(new Projectile(px + 10, py - 10, 4, -15, 'SPREAD', false, 1.5 + upgrades.damage * 0.5));
      sounds.laserShoot('SPREAD');
    } else if (player.missileTimer > 0) {
      projectiles.push(new Projectile(px - 12, py, -2, -12, 'MISSILE', false, 4 + upgrades.damage));
      projectiles.push(new Projectile(px + 12, py, 2, -12, 'MISSILE', false, 4 + upgrades.damage));
      sounds.laserShoot('MISSILE');
    } else {
      projectiles.push(new Projectile(px - 8, py - 8, 0, -17, 'PLASMA', false, 1 + upgrades.damage));
      projectiles.push(new Projectile(px + 8, py - 8, 0, -17, 'PLASMA', false, 1 + upgrades.damage));
      sounds.laserShoot('PLASMA');
    }
  };

  // Main Canvas Render & Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      engine.current.starfield.init(canvas.width, canvas.height);
      if (gameState === 'START') {
        engine.current.player.x = canvas.width / 2 - engine.current.player.w / 2;
        engine.current.player.y = canvas.height - 120;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Main Engine Update
    const update = (time: number) => {
      const { player, enemies, boss, projectiles, enemyProjectiles, powerups, particles, starfield, keys, touchMovement } = engine.current;

      starfield.update();
      particles.update();

      if (gameState !== 'PLAYING' || isPaused) return;

      // Handle Movement Input
      const baseSpeed = (2.2 + upgrades.speed * 0.35) * (player.shipClass === 'VALKYRIE' ? 1.25 : player.shipClass === 'TITAN' ? 0.9 : 1.0);
      if (keys['ArrowLeft'] || keys['KeyA']) player.vx -= baseSpeed;
      if (keys['ArrowRight'] || keys['KeyD']) player.vx += baseSpeed;
      if (keys['ArrowUp'] || keys['KeyW']) player.vy -= baseSpeed;
      if (keys['ArrowDown'] || keys['KeyS']) player.vy += baseSpeed;

      if (touchMovement.x !== 0) player.vx += touchMovement.x * baseSpeed * 1.5;
      if (touchMovement.y !== 0) player.vy += touchMovement.y * baseSpeed * 1.5;

      if (keys['Space'] || touchMovement.isFiring) {
        handleFire();
      }

      // Update Player
      player.update(canvas.width, canvas.height);

      // Emit ion thruster exhaust particles
      if (Math.random() > 0.3) {
        const engineX1 = player.x + player.w * 0.25;
        const engineX2 = player.x + player.w * 0.75;
        const engineY = player.y + player.h * 0.85;
        particles.emitThruster(engineX1, engineY, player.vx, '#06b6d4', 2);
        particles.emitThruster(engineX2, engineY, player.vx, '#06b6d4', 2);
      }

      // Combo Timer decay
      if (engine.current.comboTimer > 0) {
        engine.current.comboTimer--;
        setComboTimer(engine.current.comboTimer);
        if (engine.current.comboTimer <= 0) {
          engine.current.comboMultiplier = 1;
          setCombo(1);
        }
      }

      // Time scale (Chrono slow powerup)
      const timeScale = player.chronoSlowTimer > 0 ? 0.45 : 1.0;

      // Dynamic Difficulty & Enemy Spawning
      const diffMult = (1 + (wave - 1) * 0.25) * (engine.current.difficulty === 'NIGHTMARE' ? 1.5 : engine.current.difficulty === 'VETERAN' ? 1.2 : 1.0);
      const spawnInterval = Math.max(350, 1600 / diffMult);

      // Check for Boss Arrival (every 3 waves)
      if (wave % 3 === 0 && !boss && engine.current.waveEnemiesDefeated >= 12) {
        const bossHp = 200 + wave * 150;
        engine.current.boss = new Boss(canvas.width, wave, bossHp);
        sounds.bossAlert();
        setWaveBanner(`WARNING // ${engine.current.boss.name} INCOMING`);
        setTimeout(() => setWaveBanner(null), 3500);
      }

      // Spawn regular wave enemies
      if (!boss && time - engine.current.lastSpawnTime > spawnInterval) {
        const roll = Math.random();
        let type: any = 'SCOUT';
        if (roll > 0.88) type = 'FRIGATE';
        else if (roll > 0.72) type = 'DIVER';
        else if (roll > 0.58) type = 'PHANTOM';
        else if (roll > 0.42) type = 'ZIGZAG';
        else if (roll > 0.26) type = 'SINE';
        else if (roll > 0.15) type = 'ASTEROID';

        enemies.push(new Enemy(canvas.width, type, 2.2 * diffMult, diffMult));
        engine.current.lastSpawnTime = time;
      }

      // Update Projectiles (Player)
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const nearestEnemy = enemies.length > 0 ? enemies[0] : boss ? boss : null;
        p.update(nearestEnemy);

        if (p.y < -60 || p.x < -60 || p.x > canvas.width + 60 || p.y > canvas.height + 60) {
          projectiles.splice(i, 1);
        }
      }

      // Update Enemy Projectiles
      for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const b = enemyProjectiles[i];
        b.update();

        if (b.y > canvas.height + 60 || b.y < -100 || b.x < -60 || b.x > canvas.width + 60) {
          enemyProjectiles.splice(i, 1);
          continue;
        }

        // Collision with Player
        if (
          b.x > player.x &&
          b.x < player.x + player.w &&
          b.y > player.y &&
          b.y < player.y + player.h
        ) {
          const hitResult = player.takeDamage(15);
          if (hitResult.shieldAbsorbed) {
            sounds.shieldHit();
          } else {
            sounds.hit(true);
            if (settings.screenShake && !settings.reducedMotion) {
              engine.current.screenShake = 18;
            }
          }

          particles.emitExplosion(b.x, b.y, '#f97316', 12, 0.8);
          enemyProjectiles.splice(i, 1);

          if (hitResult.isDestroyed) {
            sounds.explosion('LARGE');
            setGameState('GAMEOVER');
            return;
          }
        }
      }

      // Update PowerUps
      for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.update(player.x + player.w / 2, player.y + player.h / 2, upgrades.magnetRange);

        if (p.y > canvas.height + 50) {
          powerups.splice(i, 1);
          continue;
        }

        // Collection Collision
        if (
          p.x < player.x + player.w &&
          p.x + p.width > player.x &&
          p.y < player.y + player.h &&
          p.y + p.height > player.y
        ) {
          player.applyPowerUp(p.type);
          sounds.powerup();
          particles.emitExplosion(p.x + p.width / 2, p.y + p.height / 2, p.color, 18, 1);
          setStats(s => ({ ...s, powerupsCollected: s.powerupsCollected + 1 }));
          powerups.splice(i, 1);
        }
      }

      // Update Boss
      if (boss) {
        boss.update(canvas.width, canvas.height, timeScale);

        if (boss.state !== 'DYING') {
          // Boss Attack Patterns
          if (boss.state === 'PHASE_1' && Math.floor(boss.stateTimer) % 35 === 0) {
            enemyProjectiles.push(new Projectile(boss.x + boss.width * 0.25, boss.y + boss.height, 0, 7, 'ENEMY_HEAVY', true));
            enemyProjectiles.push(new Projectile(boss.x + boss.width * 0.75, boss.y + boss.height, 0, 7, 'ENEMY_HEAVY', true));
            sounds.enemyShoot();
          } else if (boss.state === 'PHASE_2' && Math.floor(boss.stateTimer) % 20 === 0) {
            const angle = boss.stateTimer * 0.2;
            enemyProjectiles.push(new Projectile(boss.x + boss.width / 2, boss.y + boss.height / 2, Math.cos(angle) * 6, Math.sin(angle) * 6 + 3, 'ENEMY_BOLT', true));
            sounds.enemyShoot();
          } else if (boss.state === 'RAGE' && Math.floor(boss.stateTimer) % 15 === 0) {
            const dx = (player.x + player.w / 2) - (boss.x + boss.width / 2);
            const dy = (player.y + player.h / 2) - (boss.y + boss.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            enemyProjectiles.push(new Projectile(boss.x + boss.width / 2, boss.y + boss.height / 2, (dx / dist) * 9, (dy / dist) * 9, 'ENEMY_HEAVY', true));
            sounds.enemyShoot();
          }

          // Player bullets hitting Boss
          for (let bi = projectiles.length - 1; bi >= 0; bi--) {
            const b = projectiles[bi];
            if (
              b.x > boss.x &&
              b.x < boss.x + boss.width &&
              b.y > boss.y &&
              b.y < boss.y + boss.height
            ) {
              boss.takeDamage(b.damage);
              particles.emitExplosion(b.x, b.y, b.color, 8, 0.7);
              setStats(s => ({ ...s, shotsHit: s.shotsHit + 1 }));
              sounds.hit(false);

              if (!b.piercing) {
                projectiles.splice(bi, 1);
              }

              if (boss.hp <= 0) {
                boss.state = 'DYING';
                sounds.explosion('LARGE');
                if (settings.screenShake && !settings.reducedMotion) {
                  engine.current.screenShake = 30;
                }
              }
            }
          }
        } else {
          // Boss Death Sequence
          if (Math.floor(boss.deathTimer) % 6 === 0) {
            const rx = boss.x + Math.random() * boss.width;
            const ry = boss.y + Math.random() * boss.height;
            particles.emitExplosion(rx, ry, '#f43f5e', 20, 1.5);
            sounds.explosion('MEDIUM');
          }

          if (boss.deathTimer > 150) {
            const bonusScore = 5000 * wave;
            const bonusCredits = 250;
            setScore(s => s + bonusScore);
            setCredits(c => {
              const next = c + bonusCredits;
              localStorage.setItem('galaxy_credits', next.toString());
              return next;
            });

            engine.current.boss = null;
            engine.current.waveEnemiesDefeated = 0;
            setWave(w => w + 1);
            setGameState('SHOP');
            sounds.waveClear();
          }
        }
      }

      // Update Normal Enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.update(canvas.width, player.x, player.y, timeScale);

        // Enemy shooting
        if (e.canShoot && Math.random() < e.shootRate * timeScale) {
          enemyProjectiles.push(new Projectile(e.x + e.w / 2, e.y + e.h, 0, 6.5, 'ENEMY_BOLT', true));
          sounds.enemyShoot();
        }

        if (e.y > canvas.height + 70) {
          enemies.splice(i, 1);
          continue;
        }

        // Bullet vs Enemy Collisions
        for (let bi = projectiles.length - 1; bi >= 0; bi--) {
          const b = projectiles[bi];
          if (
            b.x > e.x &&
            b.x < e.x + e.w &&
            b.y > e.y &&
            b.y < e.y + e.h
          ) {
            e.takeDamage(b.damage);
            particles.emitExplosion(b.x, b.y, b.color, 6, 0.6);
            setStats(s => ({ ...s, shotsHit: s.shotsHit + 1 }));
            sounds.hit(false);

            if (!b.piercing) {
              projectiles.splice(bi, 1);
            }

            if (e.hp <= 0) {
              particles.emitExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, 24, 1.2);
              sounds.explosion(e.type === 'FRIGATE' ? 'LARGE' : 'SMALL');

              // Increment Combo
              engine.current.comboMultiplier = Math.min(10, engine.current.comboMultiplier + 1);
              engine.current.comboTimer = 120; // 2 seconds
              setCombo(engine.current.comboMultiplier);
              setComboTimer(120);

              // Score calculation with combo
              const killScore = e.scoreValue * engine.current.comboMultiplier;
              setScore(s => {
                const next = s + killScore;
                if (next > highScore) {
                  setHighScore(next);
                  setIsNewHigh(true);
                  localStorage.setItem('galaxy_high_score', next.toString());
                }
                return next;
              });

              // Charge Player EMP (5% per kill)
              player.empCharge = Math.min(100, player.empCharge + 6);

              // Credits
              setCredits(c => {
                const next = c + 5;
                localStorage.setItem('galaxy_credits', next.toString());
                return next;
              });

              setStats(s => ({
                ...s,
                enemiesDefeated: s.enemiesDefeated + 1,
                maxCombo: Math.max(s.maxCombo, engine.current.comboMultiplier)
              }));

              engine.current.waveEnemiesDefeated++;

              // PowerUp Drop (18% probability)
              if (Math.random() < 0.18) {
                const types: PowerUpType[] = [
                  'RAPID_FIRE', 'SPREAD_SHOT', 'PHOTON_BEAM', 'HOMING_MISSILES',
                  'SHIELD_REFILL', 'CHRONO_SLOW', 'SUPER_BOMB', 'REPAIR_KIT'
                ];
                powerups.push(new PowerUp(e.x + e.w / 2, e.y + e.h / 2, types[Math.floor(Math.random() * types.length)]));
              }

              enemies.splice(i, 1);
              break;
            }
          }
        }

        // Enemy vs Player Hull Collision
        if (
          e.x < player.x + player.w &&
          e.x + e.w > player.x &&
          e.y < player.y + player.h &&
          e.y + e.h > player.y
        ) {
          const hitResult = player.takeDamage(25);
          particles.emitExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, 18, 1);
          enemies.splice(i, 1);

          if (hitResult.shieldAbsorbed) {
            sounds.shieldHit();
          } else {
            sounds.hit(true);
            if (settings.screenShake && !settings.reducedMotion) {
              engine.current.screenShake = 22;
            }
          }

          if (hitResult.isDestroyed) {
            sounds.explosion('LARGE');
            setGameState('GAMEOVER');
            return;
          }
        }
      }

      // Check Regular Wave Completion (15 normal kills without boss)
      if (!boss && engine.current.waveEnemiesDefeated >= 16 && wave % 3 !== 0) {
        engine.current.waveEnemiesDefeated = 0;
        setWave(w => w + 1);
        setGameState('SHOP');
        sounds.waveClear();
      }

      // Screen shake decay
      if (engine.current.screenShake > 0.1) {
        engine.current.screenShake *= 0.9;
      }
    };

    // Main Canvas Render
    const draw = () => {
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Apply screen shake if enabled
      if (settings.screenShake && !settings.reducedMotion && engine.current.screenShake > 0.5) {
        const s = engine.current.screenShake;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      }

      // Draw Starfield & Cosmic Dust
      engine.current.starfield.draw(ctx);

      // Draw Projectiles
      engine.current.projectiles.forEach(p => p.draw(ctx));
      engine.current.enemyProjectiles.forEach(b => b.draw(ctx));

      // Draw PowerUps
      engine.current.powerups.forEach(p => p.draw(ctx));

      // Draw Enemies
      engine.current.enemies.forEach(e => e.draw(ctx));

      // Draw Boss
      if (engine.current.boss) {
        engine.current.boss.draw(ctx);
      }

      // Draw Player
      engine.current.player.draw(ctx);

      // Draw Particle System
      engine.current.particles.draw(ctx);

      ctx.restore();

      animId = requestAnimationFrame((t) => {
        update(t);
        draw();
      });
    };

    draw();

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      engine.current.keys[e.code] = true;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'PLAYING') {
          setIsPaused(p => !p);
        }
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') {
        triggerEMP();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      engine.current.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resize);
    };
  }, [gameState, isPaused, upgrades, wave, highScore, settings, triggerEMP]);

  // Handle Upgrades Purchase in Shop
  const handleUpgrade = (key: keyof Upgrades) => {
    let cost = 0;
    switch (key) {
      case 'maxHealth':
        cost = Math.floor((upgrades.maxHealth / 20) * 60);
        break;
      case 'maxShield':
        cost = Math.floor((upgrades.maxShield / 20) * 70);
        break;
      case 'damage':
        cost = Math.floor(upgrades.damage * 90);
        break;
      case 'fireRate':
        cost = Math.floor(upgrades.fireRate * 80);
        break;
      case 'speed':
        cost = Math.floor(upgrades.speed * 60);
        break;
      case 'magnetRange':
        cost = Math.floor(upgrades.magnetRange * 50);
        break;
      default:
        cost = 100;
    }

    if (credits >= cost) {
      setCredits(c => {
        const next = c - cost;
        localStorage.setItem('galaxy_credits', next.toString());
        return next;
      });

      setUpgrades(prev => {
        const newVal = key === 'maxHealth' || key === 'maxShield' ? prev[key] + 20 : prev[key] + 1;
        return { ...prev, [key]: newVal };
      });

      sounds.powerup();
    }
  };

  // Touch Movement Handlers for Mobile
  const handleTouchMoveStart = (dir: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
    if (dir === 'LEFT') engine.current.touchMovement.x = -1;
    if (dir === 'RIGHT') engine.current.touchMovement.x = 1;
    if (dir === 'UP') engine.current.touchMovement.y = -1;
    if (dir === 'DOWN') engine.current.touchMovement.y = 1;
  };

  const handleTouchMoveEnd = (dir: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
    if (dir === 'LEFT' || dir === 'RIGHT') engine.current.touchMovement.x = 0;
    if (dir === 'UP' || dir === 'DOWN') engine.current.touchMovement.y = 0;
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 font-sans select-none">
      {/* Game Canvas */}
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Cockpit Scanlines Overlay */}
      <div className="absolute inset-0 cockpit-scanlines z-10 pointer-events-none" />
      <div className="absolute inset-0 cockpit-vignette z-10 pointer-events-none" />

      {/* Wave Transition Banner */}
      {waveBanner && (
        <div className="absolute top-1/4 inset-x-0 flex justify-center items-center z-25 pointer-events-none animate-bounce">
          <div className="bg-slate-900/90 backdrop-blur-md px-6 py-2.5 rounded-full border border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.8)] text-cyan-300 font-mono font-bold text-sm sm:text-base tracking-widest uppercase">
            <DecryptedText text={waveBanner} speed={20} />
          </div>
        </div>
      )}

      {/* In-Game HUD */}
      {gameState === 'PLAYING' && (
        <CockpitHUD
          player={engine.current.player}
          score={score}
          highScore={highScore}
          credits={credits}
          wave={wave}
          combo={combo}
          comboTimer={comboTimer}
          boss={engine.current.boss}
          onPause={() => setIsPaused(true)}
          onTriggerEMP={triggerEMP}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Mobile Touch Controls */}
      {gameState === 'PLAYING' && isMobile && (
        <TouchControls
          onMoveStart={handleTouchMoveStart}
          onMoveEnd={handleTouchMoveEnd}
          onFireStart={() => { engine.current.touchMovement.isFiring = true; }}
          onFireEnd={() => { engine.current.touchMovement.isFiring = false; }}
          onTriggerEMP={triggerEMP}
          empReady={engine.current.player.empCharge >= 100}
        />
      )}

      {/* Title / Start Menu */}
      {gameState === 'START' && (
        <StartMenu
          onStartGame={startGame}
          highScore={highScore}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Pause Modal */}
      {gameState === 'PLAYING' && isPaused && (
        <PauseModal
          onResume={() => setIsPaused(false)}
          onRestart={() => startGame(engine.current.player.shipClass, engine.current.difficulty)}
          onQuit={() => {
            sounds.stopMusic();
            setGameState('START');
            setIsPaused(false);
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Command Center / Shop Modal */}
      {gameState === 'SHOP' && (
        <HangarShopModal
          wave={wave}
          credits={credits}
          upgrades={upgrades}
          onUpgrade={handleUpgrade}
          onContinue={() => {
            setGameState('PLAYING');
            engine.current.player.hp = upgrades.maxHealth;
            engine.current.player.shield = upgrades.maxShield;
            setWaveBanner(`SECTOR 0${wave} // ENTERING COMBAT ZONE`);
            setTimeout(() => setWaveBanner(null), 3000);
          }}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'GAMEOVER' && (
        <GameOverModal
          stats={{
            ...stats,
            score,
            wave,
            timeSurvivedSeconds: Math.floor((performance.now() - engine.current.gameStartTime) / 1000)
          }}
          highScore={highScore}
          isNewHigh={isNewHigh}
          onRestart={() => startGame(engine.current.player.shipClass, engine.current.difficulty)}
          onReturnToMenu={() => {
            sounds.stopMusic();
            setGameState('START');
          }}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};
