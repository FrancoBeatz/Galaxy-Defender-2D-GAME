import { EnemyType } from '../../types/game';

export class Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  type: EnemyType;
  startX: number;
  timer: number = 0;
  hp: number;
  maxHp: number;
  canShoot: boolean = false;
  shootRate: number = 0.008;
  scoreValue: number;
  color: string;
  glowColor: string;
  hitFlash: number = 0;
  cloaked: boolean = false;
  cloakTimer: number = 0;
  diveState: 'HOVER' | 'DIVING' | 'RECOVER' = 'HOVER';
  targetPlayerX: number = 0;
  rotation: number = 0;
  rotationSpeed: number = 0;

  constructor(canvasWidth: number, type: EnemyType, speedBase: number, waveDifficulty: number = 1) {
    this.type = type;
    this.startX = Math.random() * Math.max(100, canvasWidth - 80) + 40;
    this.x = this.startX;
    this.y = -60;

    switch (type) {
      case 'SCOUT':
        this.w = 34;
        this.h = 30;
        this.speed = speedBase * 1.4;
        this.hp = 1;
        this.canShoot = true;
        this.shootRate = 0.012 * waveDifficulty;
        this.color = '#38bdf8';
        this.glowColor = '#0284c7';
        this.scoreValue = 60;
        break;

      case 'SINE':
        this.w = 42;
        this.h = 38;
        this.speed = speedBase * 0.95;
        this.hp = Math.floor(2 * waveDifficulty);
        this.canShoot = true;
        this.shootRate = 0.015 * waveDifficulty;
        this.color = '#c084fc';
        this.glowColor = '#9333ea';
        this.scoreValue = 90;
        break;

      case 'DIVER':
        this.w = 38;
        this.h = 44;
        this.speed = speedBase * 0.8;
        this.hp = Math.floor(3 * waveDifficulty);
        this.color = '#f87171';
        this.glowColor = '#dc2626';
        this.scoreValue = 120;
        break;

      case 'ZIGZAG':
        this.w = 36;
        this.h = 34;
        this.speed = speedBase * 1.25;
        this.hp = Math.floor(2 * waveDifficulty);
        this.color = '#34d399';
        this.glowColor = '#059669';
        this.scoreValue = 100;
        break;

      case 'FRIGATE':
        this.w = 64;
        this.h = 58;
        this.speed = speedBase * 0.55;
        this.hp = Math.floor(7 * waveDifficulty);
        this.canShoot = true;
        this.shootRate = 0.02 * waveDifficulty;
        this.color = '#fb923c';
        this.glowColor = '#ea580c';
        this.scoreValue = 250;
        break;

      case 'PHANTOM':
        this.w = 40;
        this.h = 36;
        this.speed = speedBase * 1.1;
        this.hp = Math.floor(3 * waveDifficulty);
        this.canShoot = true;
        this.shootRate = 0.014 * waveDifficulty;
        this.color = '#818cf8';
        this.glowColor = '#4f46e5';
        this.scoreValue = 180;
        break;

      case 'ASTEROID':
      default:
        this.w = 46;
        this.h = 46;
        this.speed = speedBase * 0.7;
        this.hp = Math.floor(4 * waveDifficulty);
        this.color = '#94a3b8';
        this.glowColor = '#64748b';
        this.scoreValue = 50;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        break;
    }

    this.maxHp = this.hp;
  }

  update(canvasWidth: number, playerX?: number, playerY?: number, timeScale: number = 1.0) {
    this.timer += timeScale;
    if (this.hitFlash > 0) this.hitFlash--;

    const currentSpeed = this.speed * timeScale;

    switch (this.type) {
      case 'SCOUT':
        this.y += currentSpeed;
        if (Math.floor(this.timer) % 80 < 40) {
          this.x += 2.2 * timeScale;
        } else {
          this.x -= 2.2 * timeScale;
        }
        break;

      case 'SINE':
        this.y += currentSpeed;
        this.x = this.startX + Math.sin(this.timer * 0.04) * 110;
        break;

      case 'DIVER':
        if (this.diveState === 'HOVER') {
          this.y += currentSpeed * 0.6;
          if (playerX !== undefined) this.targetPlayerX = playerX;
          if (this.y > 140) {
            this.diveState = 'DIVING';
          }
        } else if (this.diveState === 'DIVING') {
          this.y += currentSpeed * 3.6;
          this.x += (this.targetPlayerX - this.x) * 0.04 * timeScale;
        }
        break;

      case 'ZIGZAG':
        this.y += currentSpeed;
        this.x = this.startX + Math.sin(this.timer * 0.12) * 90;
        break;

      case 'FRIGATE':
        this.y += currentSpeed;
        this.x = this.startX + Math.sin(this.timer * 0.02) * 50;
        break;

      case 'PHANTOM':
        this.cloakTimer += timeScale;
        if (this.cloakTimer > 180) {
          this.cloaked = !this.cloaked;
          this.cloakTimer = 0;
          if (!this.cloaked) {
            this.x = Math.random() * (canvasWidth - this.w);
          }
        }
        this.y += currentSpeed;
        break;

      case 'ASTEROID':
        this.y += currentSpeed;
        this.rotation += this.rotationSpeed * timeScale;
        break;

      default:
        this.y += currentSpeed;
    }

    this.x = Math.max(10, Math.min(canvasWidth - this.w - 10, this.x));
  }

  takeDamage(amount: number) {
    this.hp -= amount;
    this.hitFlash = 6;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);

    if (this.type === 'PHANTOM' && this.cloaked) {
      ctx.globalAlpha = 0.18;
    }

    if (this.hitFlash > 0) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
    } else {
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.glowColor;
      ctx.fillStyle = this.color;
      ctx.strokeStyle = this.color;
    }

    ctx.lineWidth = 2;

    if (this.type === 'ASTEROID') {
      ctx.rotate(this.rotation);
      ctx.beginPath();
      const r = this.w / 2;
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#334155';
      ctx.fill();
      ctx.stroke();

      // Craters
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.2, r * 0.3, 0, Math.PI * 2);
      ctx.arc(r * 0.3, r * 0.2, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'SCOUT') {
      // Dart Interceptor silhouette
      ctx.beginPath();
      ctx.moveTo(0, this.h / 2);
      ctx.lineTo(-this.w / 2, -this.h / 2);
      ctx.lineTo(0, -this.h / 4);
      ctx.lineTo(this.w / 2, -this.h / 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.stroke();

      // Cockpit / Eye
      ctx.fillStyle = this.glowColor;
      ctx.beginPath();
      ctx.arc(0, 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'SINE') {
      // Winged Glider
      ctx.beginPath();
      ctx.moveTo(0, this.h / 2);
      ctx.lineTo(-this.w / 2, -this.h / 6);
      ctx.lineTo(-this.w / 3, -this.h / 2);
      ctx.lineTo(0, -this.h / 3);
      ctx.lineTo(this.w / 3, -this.h / 2);
      ctx.lineTo(this.w / 2, -this.h / 6);
      ctx.closePath();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.stroke();

      // Core glow
      ctx.fillStyle = this.glowColor;
      ctx.fillRect(-4, -6, 8, 8);
    } else if (this.type === 'DIVER') {
      // Heavy V-Stalker
      ctx.beginPath();
      ctx.moveTo(0, this.h / 2);
      ctx.lineTo(-this.w / 2, -this.h / 2);
      ctx.lineTo(-this.w / 4, -this.h / 3);
      ctx.lineTo(this.w / 4, -this.h / 3);
      ctx.lineTo(this.w / 2, -this.h / 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(30, 27, 75, 0.9)';
      ctx.fill();
      ctx.stroke();

      // Thruster flare when diving
      if (this.diveState === 'DIVING') {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-6, -this.h / 2);
        ctx.lineTo(0, -this.h / 2 - 14);
        ctx.lineTo(6, -this.h / 2);
        ctx.closePath();
        ctx.fill();
      }
    } else if (this.type === 'FRIGATE') {
      // Armored Heavy Gunship
      ctx.beginPath();
      ctx.moveTo(0, this.h / 2);
      ctx.lineTo(-this.w / 3, this.h / 4);
      ctx.lineTo(-this.w / 2, -this.h / 4);
      ctx.lineTo(-this.w / 4, -this.h / 2);
      ctx.lineTo(this.w / 4, -this.h / 2);
      ctx.lineTo(this.w / 2, -this.h / 4);
      ctx.lineTo(this.w / 3, this.h / 4);
      ctx.closePath();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fill();
      ctx.stroke();

      // Turret pods
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-this.w / 2 + 4, 0, 6, 12);
      ctx.fillRect(this.w / 2 - 10, 0, 6, 12);
    } else {
      // Stealth Phantom
      ctx.beginPath();
      ctx.moveTo(0, this.h / 2);
      ctx.lineTo(-this.w / 2, 0);
      ctx.lineTo(0, -this.h / 2);
      ctx.lineTo(this.w / 2, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();

    // Floating HP Bar for tough enemies
    if (this.maxHp > 1 && this.hp < this.maxHp && this.hp > 0) {
      ctx.save();
      const barW = this.w;
      const barH = 3;
      const barX = this.x;
      const barY = this.y - 8;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(barX, barY, barW, barH);

      const healthPct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = healthPct > 0.5 ? '#22c55e' : healthPct > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(barX, barY, barW * healthPct, barH);
      ctx.restore();
    }
  }
}
