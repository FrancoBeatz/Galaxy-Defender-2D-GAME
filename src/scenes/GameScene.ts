import Phaser from 'phaser';
import { Upgrades, SpecialAbility } from '../types';
import { sounds } from '../soundGenerator';

export default class GameScene extends Phaser.Scene {
  // Game Stats/Properties (communicated with React via callbacks or events)
  private score: number = 0;
  private comboCount: number = 0;
  private maxCombo: number = 0;
  private level: number = 1;
  private xp: number = 0;
  private xpNeeded: number = 100;
  private coins: number = 0;
  private health: number = 100;
  private shield: number = 100;
  private maxHealth: number = 100;
  private maxShield: number = 100;
  private wavesCleared: number = 0;

  // Active entities
  private player!: Phaser.Physics.Arcade.Sprite;
  private shieldSprite!: Phaser.GameObjects.Sprite;
  private engineTrailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  
  // Controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wKey!: Phaser.Input.Keyboard.Key;
  private aKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;
  private dKey!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  
  // Weapon timing state
  private lastFired: number = 0;
  
  // Object pools (Groups)
  private playerLasers!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private enemyLasers!: Phaser.Physics.Arcade.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  
  // Particle Systems
  private debrisEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  
  // Game state callbacks to React to refresh standard dashboards
  private onStatsChange?: (stats: any) => void;
  private onGameOver?: (score: number, coins: number) => void;
  private onWaveCleared?: (nextWave: number) => void;

  // Dynamic values injected via upgrades
  private activeUpgrades!: Upgrades;
  private unlockedAbilities!: SpecialAbility[];

  // Wave coordination logic
  private currentWaveIndex: number = 1;
  private waveSpawnTimer: number = 0;
  private totalEnemiesToSpawn: number = 10;
  private spawnedInCurrentWave: number = 0;
  private activeBoss: boolean = false;
  private bossInstance?: any;

  // Background decoration stars / nebula effect
  private starfield1!: Phaser.GameObjects.TileSprite;
  private starfield2!: Phaser.GameObjects.TileSprite;

  constructor() {
    super('GameScene');
  }

  init(data: {
    upgrades: Upgrades;
    abilities: SpecialAbility[];
    onStatsChange: (stats: any) => void;
    onGameOver: (score: number, coins: number) => void;
    onWaveCleared: (nextWave: number) => void;
    currentWave: number;
  }) {
    this.activeUpgrades = data.upgrades || { damage: 1, fireRate: 1, speed: 1, maxHealth: 100, maxShield: 50, magnet: 1 };
    this.unlockedAbilities = data.abilities || [];
    this.onStatsChange = data.onStatsChange;
    this.onGameOver = data.onGameOver;
    this.onWaveCleared = data.onWaveCleared;
    this.currentWaveIndex = data.currentWave || 1;

    // Set standard max stats derived from dynamic upgrades
    this.maxHealth = 100 + (this.activeUpgrades.maxHealth - 1) * 20;
    this.maxShield = 50 + (this.activeUpgrades.maxShield - 1) * 15;
    this.health = this.maxHealth;
    this.shield = this.maxShield;

    this.score = 0;
    this.comboCount = 0;
    this.maxCombo = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNeeded = 100;
    this.coins = 0;
    this.wavesCleared = 0;
    this.activeBoss = false;
    this.totalEnemiesToSpawn = 8 + this.currentWaveIndex * 4;
    this.spawnedInCurrentWave = 0;
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    // Space ambient backdrop scrolling layers for absolute realistic 3D parallax feel
    this.starfield1 = this.add.tileSprite(0, 0, width, height, 'starParticle')
      .setOrigin(0, 0)
      .setAlpha(0.3)
      .setTint(0x00f2ff);
    
    this.starfield2 = this.add.tileSprite(0, 0, width, height, 'starParticle')
      .setOrigin(0, 0)
      .setAlpha(0.6)
      .setScale(1.5)
      .setTint(0xbfdbfe);

    // Initialise Particle System for Exploded Spark Debris
    const sparkParticles = this.add.particles(0, 0, 'starParticle', {
      speed: { min: -150, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 2, end: 0 },
      blendMode: 'ADD',
      lifespan: 600,
      emitting: false
    });
    this.debrisEmitter = sparkParticles;

    // Create pooled physics groups for flawless 60 FPS performance
    this.playerLasers = this.physics.add.group({
      defaultKey: 'cyanLaser',
      maxSize: 60
    });

    this.enemyLasers = this.physics.add.group({
      defaultKey: 'enemyLaser',
      maxSize: 100
    });

    this.enemies = this.physics.add.group();
    this.collectibles = this.physics.add.group();

    // Create player ship in the screen center bottom
    this.player = this.physics.add.sprite(width / 2, height - 100, 'playerShip');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    // Create engine trail fire particles following player's engine
    this.engineTrailEmitter = this.add.particles(0, 0, 'fireParticle', {
      speedY: { min: 80, max: 200 },
      speedX: { min: -20, max: 20 },
      scale: { start: 1.5, end: 0 },
      blendMode: 'ADD',
      lifespan: 400,
    }).startFollow(this.player, 0, 20);

    // Dynamic Shield Shield bubble overlay matching position & state
    this.shieldSprite = this.add.sprite(this.player.x, this.player.y, 'shieldBubble');
    this.shieldSprite.setDepth(11).setAlpha(0);

    // Set up responsive standard controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.aKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.sKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.dKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // Create overlap colliders
    this.physics.add.overlap(this.playerLasers, this.enemies, this.handleLaserEnemyOverlap, undefined, this);
    this.physics.add.overlap(this.enemyLasers, this.player, this.handleLaserPlayerOverlap, undefined, this);
    this.physics.add.overlap(this.enemies, this.player, this.handleEnemyPlayerOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.collectibles, this.handlePlayerCollectOverlap, undefined, this);

    // Broadcast setup to update state dashboard
    this.broadcastStats();
  }

  update(time: number, delta: number) {
    // Parallax background scroll speeds
    this.starfield1.tilePositionY -= 0.6;
    this.starfield2.tilePositionY -= 1.8;

    this.handlePlayerControl();
    this.handleAIBehavior(time);
    this.spawnWaveCycle(time);

    // Synchronize protective shield overlay position & intensity fade
    this.shieldSprite.setPosition(this.player.x, this.player.y);
    if (this.shield > 0) {
      this.shieldSprite.setAlpha(0.25 + Math.sin(time / 100) * 0.1);
      this.shieldSprite.setScale(1 + Math.sin(time / 150) * 0.05);
    } else {
      this.shieldSprite.setAlpha(0);
    }

    // Clean off-screen objects
    this.playerLasers.getChildren().forEach((laser: any) => {
      if (laser.y < -20) {
        this.playerLasers.killAndHide(laser);
        laser.body.enable = false;
      }
    });

    this.enemyLasers.getChildren().forEach((laser: any) => {
      if (laser.y > this.scale.height + 20) {
        this.enemyLasers.killAndHide(laser);
        laser.body.enable = false;
      }
    });

    // Auto-regen shield over time if unharmed
    if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + delta * 0.003);
    }
  }

  private handlePlayerControl() {
    let speedMultiplier = 1;
    if (this.shiftKey.isDown) {
      speedMultiplier = 1.6;
    }

    const baseSpeed = 260 + (this.activeUpgrades.speed - 1) * 35;
    const currentSpeed = baseSpeed * speedMultiplier;

    let vx = 0;
    let vy = 0;

    // WASD & Arrow support
    if (this.cursors.left.isDown || this.aKey.isDown) {
      vx = -currentSpeed;
      this.player.setAngle(-12); // Dynamic banking rot on drift
    } else if (this.cursors.right.isDown || this.dKey.isDown) {
      vx = currentSpeed;
      this.player.setAngle(12);
    } else {
      this.player.setAngle(0);
    }

    if (this.cursors.up.isDown || this.wKey.isDown) {
      vy = -currentSpeed;
    } else if (this.cursors.down.isDown || this.sKey.isDown) {
      vy = currentSpeed;
    }

    this.player.setVelocity(vx, vy);

    // Automated or manual hyper-speed shooter firing
    if (this.cursors.space.isDown || this.input.activePointer.isDown) {
      this.fireWeapon();
    }
  }

  private fireWeapon() {
    const timeNow = this.time.now;
    const baseCooldown = 280;
    const levelModifier = (this.activeUpgrades.fireRate - 1) * 35;
    const minimumCooldown = 75;
    const weaponCooldown = Math.max(minimumCooldown, baseCooldown - levelModifier);

    if (timeNow - this.lastFired > weaponCooldown) {
      // Create weapons fire offset based on ship wing width for highly realistic alignment
      const projectileCount = 1 + Math.floor(this.activeUpgrades.damage / 3);

      if (projectileCount === 1) {
        const laser = this.playerLasers.get(this.player.x, this.player.y - 15);
        if (laser) {
          laser.setActive(true).setVisible(true);
          laser.body.enable = true;
          laser.body.reset(this.player.x, this.player.y - 15);
          laser.setVelocity(0, -550);
        }
      } else if (projectileCount === 2) {
        // Dual laser configuration
        [-12, 12].forEach(offset => {
          const laser = this.playerLasers.get(this.player.x + offset, this.player.y - 10);
          if (laser) {
            laser.setActive(true).setVisible(true);
            laser.body.enable = true;
            laser.body.reset(this.player.x + offset, this.player.y - 10);
            laser.setVelocity(0, -550);
          }
        });
      } else {
        // Triple shot fan shape
        [-16, 0, 16].forEach((offset, idx) => {
          const laser = this.playerLasers.get(this.player.x + offset, this.player.y - (idx === 1 ? 15 : 8));
          if (laser) {
            laser.setActive(true).setVisible(true);
            laser.body.enable = true;
            laser.body.reset(this.player.x + offset, this.player.y - (idx === 1 ? 15 : 8));
            laser.setVelocity((idx - 1) * 80, -550);
          }
        });
      }

      sounds.playLaser();
      this.lastFired = timeNow;
    }
  }

  private spawnWaveCycle(time: number) {
    if (this.activeBoss) return;

    if (this.spawnedInCurrentWave >= this.totalEnemiesToSpawn) {
      // Check if all enemies defeated
      if (this.enemies.countActive(true) === 0) {
        this.wavesCleared++;
        this.broadcastStats();
        if (this.onWaveCleared) {
          this.onWaveCleared(this.currentWaveIndex + 1);
        }
        
        // Spawn Wave Boss
        this.triggerBossFight();
      }
      return;
    }

    if (time > this.waveSpawnTimer) {
      // High octane swarm formula dependent on active wave index
      const spawnCount = Math.min(3, this.totalEnemiesToSpawn - this.spawnedInCurrentWave);
      const enemyTypes: ('enemyFighter' | 'enemyScout' | 'enemyHeavy' | 'enemyKamikaze' | 'enemyElite')[] = 
        ['enemyFighter', 'enemyScout', 'enemyHeavy', 'enemyKamikaze', 'enemyElite'];

      for (let i = 0; i < spawnCount; i++) {
        const xPos = Phaser.Math.Between(50, this.scale.width - 50);
        const yPos = Phaser.Math.Between(-150, -40);
        
        // Match selection difficulty
        let typeIndex = 0;
        if (this.currentWaveIndex > 4) typeIndex = Phaser.Math.Between(0, 4);
        else if (this.currentWaveIndex > 2) typeIndex = Phaser.Math.Between(0, 3);
        else typeIndex = Phaser.Math.Between(0, 1);

        const chosenKey = enemyTypes[typeIndex];
        const enemy = this.physics.add.sprite(xPos, yPos, chosenKey);
        this.enemies.add(enemy);

        // Assign core metrics depending on alien tier
        let hpValue = 1;
        if (chosenKey === 'enemyHeavy') hpValue = 4;
        else if (chosenKey === 'enemyElite') hpValue = 3;

        enemy.setData('hp', hpValue);
        enemy.setData('maxHp', hpValue);
        enemy.setData('type', chosenKey);

        // Give downward velocity with interesting drift behavior
        const speed = 60 + Phaser.Math.Between(10, 50) + this.currentWaveIndex * 5;
        enemy.setVelocityY(speed);
        if (chosenKey === 'enemyKamikaze') {
          enemy.setVelocityY(speed * 1.5);
          // Kamikaze charges player directly on spawn line
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          this.physics.moveTo(enemy, this.player.x, this.player.y, speed * 2);
        }

        this.spawnedInCurrentWave++;
      }

      this.waveSpawnTimer = time + Math.max(1200, 3500 - this.currentWaveIndex * 200);
    }
  }

  private triggerBossFight() {
    this.activeBoss = true;
    const width = this.scale.width;
    
    // Create an intimidating procedural multi-wing giant mech as the boss
    const bossModel = this.physics.add.sprite(width / 2, -180, 'enemyElite');
    bossModel.setScale(2.5);
    bossModel.setTint(0xff00ea);
    this.enemies.add(bossModel);

    const bossHPMax = 50 + this.currentWaveIndex * 40;
    bossModel.setData('hp', bossHPMax);
    bossModel.setData('maxHp', bossHPMax);
    bossModel.setData('type', 'boss');

    // Smooth descent to combat arena coordinate
    this.tweens.add({
      targets: bossModel,
      y: 150,
      duration: 2500,
      ease: 'Power2',
      onComplete: () => {
        // Patrol side-to-side pattern
        this.tweens.add({
          targets: bossModel,
          x: { from: width/2 - 120, to: width/2 + 120 },
          duration: 3000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });

    this.bossInstance = bossModel;
    this.broadcastStats();
  }

  private handleAIBehavior(time: number) {
    this.enemies.getChildren().forEach((item: any) => {
      const type = item.getData('type');
      if (type === 'boss') {
        // Multi-point orbital firing depending on wave difficulty
        if (Phaser.Math.Between(0, 100) < 4) {
          const laserLeft = this.enemyLasers.get(item.x - 30, item.y + 40);
          const laserRight = this.enemyLasers.get(item.x + 30, item.y + 40);
          [laserLeft, laserRight].forEach((l, idx) => {
            if (l) {
              l.setActive(true).setVisible(true);
              l.body.enable = true;
              l.body.reset(item.x + (idx === 0 ? -30 : 30), item.y + 40);
              l.setVelocity(Phaser.Math.Between(-120, 120), 280);
            }
          });
        }
      } else {
        // Standard scout/fighter bullet release pattern
        if (Phaser.Math.Between(0, 2500) < 6 + this.currentWaveIndex) {
          const laser = this.enemyLasers.get(item.x, item.y + 15);
          if (laser) {
            laser.setActive(true).setVisible(true);
            laser.body.enable = true;
            laser.body.reset(item.x, item.y + 15);
            // Track dynamic target vectors targeting player coordinates
            const angle = Phaser.Math.Angle.Between(item.x, item.y, this.player.x, this.player.y);
            this.physics.velocityFromRotation(angle, 250, laser.body.velocity);
          }
        }
      }

      // Self cleanup if alien gets out of boundary below
      if (item.y > this.scale.height + 60) {
        item.destroy();
      }
    });
  }

  private handleLaserEnemyOverlap(laser: any, enemy: any) {
    this.playerLasers.killAndHide(laser);
    laser.body.enable = false;

    // Damage calculations matching level upgrade scaling
    let damage = this.activeUpgrades.damage; 
    let currentHp = enemy.getData('hp') - damage;
    enemy.setData('hp', currentHp);

    // Spawn damage popups for an elegant AAA feel
    this.createFloatingText(enemy.x, enemy.y - 20, `-${damage}`, '#00f2ff');

    // Trigger visual hit ripples
    this.tweens.add({
      targets: enemy,
      alpha: 0.2,
      duration: 60,
      yoyo: true,
      repeat: 0
    });

    if (currentHp <= 0) {
      this.explodeEnemy(enemy);
    } else {
      sounds.playZap();
    }
  }

  private handleLaserPlayerOverlap(player: any, laser: any) {
    this.enemyLasers.killAndHide(laser);
    laser.body.enable = false;
    this.triggerPlayerDamage(12);
  }

  private handleEnemyPlayerOverlap(player: any, enemy: any) {
    enemy.destroy();
    this.triggerPlayerDamage(24);
  }

  private triggerPlayerDamage(amt: number) {
    this.cameras.main.shake(200, 0.015);

    if (this.shield > 0) {
      this.shield = Math.max(0, this.shield - amt);
      sounds.playShieldHit();
    } else {
      this.health = Math.max(0, this.health - amt);
      sounds.playHurt();
    }

    // Spawn warning text indicators
    this.createFloatingText(this.player.x, this.player.y - 45, `ALERT!`, '#ff0055');

    this.broadcastStats();

    if (this.health <= 0) {
      this.debrisEmitter!.explode(40, this.player.x, this.player.y);
      sounds.playBossExplosion();
      this.player.destroy();
      
      if (this.onGameOver) {
        this.onGameOver(this.score, this.coins);
      }
    }
  }

  private explodeEnemy(enemy: any) {
    const enemyX = enemy.x;
    const enemyY = enemy.y;
    const isBoss = enemy.getData('type') === 'boss';

    // Spark blast particles
    this.debrisEmitter!.explode(isBoss ? 60 : 15, enemyX, enemyY);

    // Distribute score updates matching multipliers
    const points = isBoss ? 2500 : 120;
    this.score += points * (1 + Math.floor(this.comboCount / 10));
    this.comboCount++;
    if (this.comboCount > this.maxCombo) {
      this.maxCombo = this.comboCount;
    }

    if (isBoss) {
      sounds.playBossExplosion();
      this.activeBoss = false;
      this.bossInstance = undefined;
    } else {
      sounds.playExplosion();
    }

    // Spawn resource drop items (Gems for XP, coins for weapons buy)
    const pickupCount = isBoss ? Phaser.Math.Between(5, 10) : (Phaser.Math.Between(0, 100) < 40 ? 1 : 0);
    for (let i = 0; i < pickupCount; i++) {
      const ranType = Phaser.Math.Between(0, 100) < 55 ? 'coinTexture' : 'xpGem';
      const item = this.physics.add.sprite(
        enemyX + Phaser.Math.Between(-15, 15), 
        enemyY + Phaser.Math.Between(-15, 15), 
        ranType
      );
      this.collectibles.add(item);
      item.setVelocity(Phaser.Math.Between(-60, 60), Phaser.Math.Between(-120, -50));
      item.setGravityY(200);
      item.setData('type', ranType);
    }

    enemy.destroy();
    this.broadcastStats();
  }

  private handlePlayerCollectOverlap(player: any, collectible: any) {
    const type = collectible.getData('type');
    collectible.destroy();

    if (type === 'coinTexture') {
      this.coins += 10;
      sounds.playCoin();
      this.createFloatingText(player.x, player.y - 30, `+10 CREDITS`, '#ffea00');
    } else if (type === 'xpGem') {
      this.xp += 15;
      sounds.playPowerup();
      this.createFloatingText(player.x, player.y - 30, `+15 XP`, '#a855f7');
      
      // Auto upgrade level boundaries
      if (this.xp >= this.xpNeeded) {
        this.level++;
        this.xp = 0;
        this.xpNeeded = Math.floor(this.xpNeeded * 1.5);
        sounds.playLevelUp();
        this.createFloatingText(player.x, player.y - 50, `LEVEL UP!`, '#00f2ff');
      }
    }

    this.broadcastStats();
  }

  private createFloatingText(x: number, y: number, text: string, color: string) {
    const lbl = this.add.text(x, y, text, {
      fontFamily: 'Inter, Segoe UI, Roboto, Arial',
      fontSize: '14px',
      color: color,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: lbl,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => lbl.destroy()
    });
  }

  private broadcastStats() {
    if (this.onStatsChange) {
      this.onStatsChange({
        score: this.score,
        coins: this.coins,
        xp: this.xp,
        level: this.level,
        xpNeeded: this.xpNeeded,
        health: this.health,
        maxHealth: this.maxHealth,
        shield: this.shield,
        maxShield: this.maxShield,
        comboCount: this.comboCount,
        bossHp: this.bossInstance ? this.bossInstance.getData('hp') : null,
        bossMaxHp: this.bossInstance ? this.bossInstance.getData('maxHp') : null,
        wavesCleared: this.wavesCleared,
      });
    }
  }

  // Active trigger call from parent layout coordinates
  triggerAbility(type: 'SHIELD_OVERCHARGE' | 'PLASMA_BLAST' | 'TIME_WARP') {
    if (type === 'SHIELD_OVERCHARGE') {
      this.shield = this.maxShield * 1.5; // Overload state
      sounds.playPowerup();
      this.createFloatingText(this.player.x, this.player.y - 40, 'SHIELD MAX OVERDRIVE', '#ffea00');
    } else if (type === 'PLASMA_BLAST') {
      // Release large rings of nuclear plasma orbs clearing fields
      for (let i = 0; i < 16; i++) {
        const rad = (i * Math.PI) / 8;
        const pl = this.playerLasers.get(this.player.x, this.player.y);
        if (pl) {
          pl.setActive(true).setVisible(true);
          pl.body.enable = true;
          pl.body.reset(this.player.x, this.player.y);
          pl.setTexture('plasmaBall');
          pl.setVelocity(Math.cos(rad) * 450, Math.sin(rad) * 450);
        }
      }
      sounds.playPlasma();
      this.createFloatingText(this.player.x, this.player.y - 40, 'PLASMA NOVA DISCHARGE', '#ff00ea');
    } else if (type === 'TIME_WARP') {
      // Dynamic engine speeds slowing background physics objects
      sounds.playPowerup();
      this.createFloatingText(this.player.x, this.player.y - 40, 'CHRONO FIELD ACTUATED', '#00ffcc');
      
      this.enemies.getChildren().forEach((e: any) => {
        if (e.body) {
          e.body.velocity.y *= 0.25;
          e.body.velocity.x *= 0.25;
        }
      });
      this.enemyLasers.getChildren().forEach((e: any) => {
        if (e.body) {
          e.body.velocity.y *= 0.25;
          e.body.velocity.x *= 0.25;
        }
      });

      // Reset coordinates back to baseline following short decay
      this.time.delayedCall(4000, () => {
        this.enemies.getChildren().forEach((e: any) => {
          if (e.body) {
            e.body.velocity.y *= 4;
            e.body.velocity.x *= 4;
          }
        });
      });
    }
  }
}
