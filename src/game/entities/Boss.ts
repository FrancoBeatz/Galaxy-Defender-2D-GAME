import { BossType } from '../../types/game';

export class Boss {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  type: BossType;
  name: string;
  state: 'ENTERING' | 'PHASE_1' | 'PHASE_2' | 'RAGE' | 'DYING' = 'ENTERING';
  stateTimer: number = 0;
  deathTimer: number = 0;
  angle: number = 0;
  targetX: number = 0;
  hitFlash: number = 0;
  color: string;
  glowColor: string;
  isShielded: boolean = false;
  shieldHp: number = 0;
  maxShieldHp: number = 0;
  telegraphBeam: boolean = false;
  beamProgress: number = 0;

  constructor(canvasWidth: number, wave: number, maxHp: number) {
    this.maxHp = maxHp;
    this.hp = maxHp;

    if (wave % 9 === 0) {
      this.type = 'LEVIATHAN';
      this.name = 'VOID LEVIATHAN';
      this.width = 240;
      this.height = 150;
      this.color = '#a855f7';
      this.glowColor = '#9333ea';
    } else if (wave % 6 === 0) {
      this.type = 'DREADNOUGHT';
      this.name = 'NEMESIS DREADNOUGHT';
      this.width = 220;
      this.height = 140;
      this.color = '#ef4444';
      this.glowColor = '#dc2626';
    } else {
      this.type = 'HARVESTER';
      this.name = 'ONYX HARVESTER';
      this.width = 190;
      this.height = 120;
      this.color = '#06b6d4';
      this.glowColor = '#0891b2';
    }

    this.x = canvasWidth / 2 - this.width / 2;
    this.y = -220;
    this.targetX = this.x;
  }

  takeDamage(amount: number) {
    if (this.state === 'DYING' || this.isShielded) return;
    this.hp -= amount;
    this.hitFlash = 5;

    // Phase transitions based on HP
    const hpRatio = this.hp / this.maxHp;
    if (hpRatio <= 0.35 && this.state !== 'RAGE') {
      this.state = 'RAGE';
      this.stateTimer = 0;
    } else if (hpRatio <= 0.7 && this.state === 'PHASE_1') {
      this.state = 'PHASE_2';
      this.stateTimer = 0;
    }
  }

  update(canvasWidth: number, canvasHeight: number, timeScale: number = 1.0) {
    this.stateTimer += timeScale;
    if (this.hitFlash > 0) this.hitFlash--;

    if (this.state === 'ENTERING') {
      if (this.y < 90) {
        this.y += 2.5 * timeScale;
      } else {
        this.state = 'PHASE_1';
        this.stateTimer = 0;
      }
      return;
    }

    if (this.state === 'DYING') {
      this.deathTimer += timeScale;
      this.y += 0.3 * timeScale;
      this.x += (Math.random() - 0.5) * 6 * timeScale;
      return;
    }

    // Boss Combat Movements
    if (this.type === 'HARVESTER') {
      this.angle += 0.025 * timeScale;
      this.x = (canvasWidth / 2 - this.width / 2) + Math.sin(this.angle) * (canvasWidth * 0.28);
      this.y = 80 + Math.cos(this.angle * 1.5) * 35;
    } else if (this.type === 'DREADNOUGHT') {
      this.x += (this.targetX - this.x) * 0.03 * timeScale;
      this.y = 95 + Math.sin(this.stateTimer * 0.03) * 20;

      if (Math.floor(this.stateTimer) % 240 === 0) {
        this.targetX = Math.random() * (canvasWidth - this.width - 80) + 40;
      }
    } else if (this.type === 'LEVIATHAN') {
      this.angle += 0.035 * timeScale;
      this.x = (canvasWidth / 2 - this.width / 2) + Math.sin(this.angle) * (canvasWidth * 0.35);
      this.y = 85 + Math.sin(this.stateTimer * 0.05) * 45;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

    if (this.hitFlash > 0) {
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
    } else {
      ctx.shadowBlur = 20;
      ctx.shadowColor = this.glowColor;
      ctx.fillStyle = this.color;
      ctx.strokeStyle = this.color;
    }

    ctx.lineWidth = 3;

    // Draw Dreadnought Silhouette
    ctx.beginPath();
    ctx.moveTo(0, this.height / 2);
    ctx.lineTo(-this.width / 3, this.height / 3);
    ctx.lineTo(-this.width / 2, -this.height / 4);
    ctx.lineTo(-this.width / 3, -this.height / 2);
    ctx.lineTo(this.width / 3, -this.height / 2);
    ctx.lineTo(this.width / 2, -this.height / 4);
    ctx.lineTo(this.width / 3, this.height / 3);
    ctx.closePath();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fill();
    ctx.stroke();

    // Core Reactor glowing in center
    const pulse = 1 + Math.sin(this.stateTimer * 0.1) * 0.2;
    ctx.fillStyle = this.glowColor;
    ctx.beginPath();
    ctx.arc(0, 0, 16 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Wing weapon hardpoints
    ctx.fillStyle = this.state === 'RAGE' ? '#f43f5e' : this.color;
    ctx.fillRect(-this.width / 2 + 10, -10, 12, 30);
    ctx.fillRect(this.width / 2 - 22, -10, 12, 30);

    // Telegraph charge beam lines
    if (this.telegraphBeam) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, this.height / 2);
      ctx.lineTo(0, 800);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Shield Dome if shielded
    if (this.isShielded) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.width * 0.65, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
