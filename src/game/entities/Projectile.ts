export type ProjectileType = 'PLASMA' | 'SPREAD' | 'BEAM' | 'MISSILE' | 'ENEMY_BOLT' | 'ENEMY_HEAVY';

export class Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  type: ProjectileType;
  fromEnemy: boolean;
  damage: number;
  piercing: boolean;
  color: string;
  glowColor: string;
  targetX?: number;
  targetY?: number;
  life: number = 0;
  maxLife: number = 300;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    type: ProjectileType = 'PLASMA',
    fromEnemy: boolean = false,
    damage: number = 1
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    this.fromEnemy = fromEnemy;
    this.damage = damage;
    this.piercing = type === 'BEAM';

    if (fromEnemy) {
      if (type === 'ENEMY_HEAVY') {
        this.width = 12;
        this.height = 12;
        this.color = '#ef4444';
        this.glowColor = '#dc2626';
      } else {
        this.width = 7;
        this.height = 10;
        this.color = '#f97316';
        this.glowColor = '#ea580c';
      }
    } else {
      switch (type) {
        case 'SPREAD':
          this.width = 6;
          this.height = 14;
          this.color = '#e879f9';
          this.glowColor = '#d946ef';
          break;
        case 'BEAM':
          this.width = 10;
          this.height = 36;
          this.color = '#38bdf8';
          this.glowColor = '#0284c7';
          break;
        case 'MISSILE':
          this.width = 6;
          this.height = 16;
          this.color = '#facc15';
          this.glowColor = '#eab308';
          break;
        case 'PLASMA':
        default:
          this.width = 5;
          this.height = 16;
          this.color = '#22d3ee';
          this.glowColor = '#06b6d4';
          break;
      }
    }
  }

  update(nearestTarget?: { x: number; y: number; w: number; h: number } | null) {
    this.life++;

    // Homing Missile physics
    if (this.type === 'MISSILE' && nearestTarget && this.life > 6) {
      const targetCenterX = nearestTarget.x + nearestTarget.w / 2;
      const targetCenterY = nearestTarget.y + nearestTarget.h / 2;
      const dx = targetCenterX - this.x;
      const dy = targetCenterY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        const targetAngle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(this.vy, this.vx);
        let diff = targetAngle - currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        const newAngle = currentAngle + Math.max(-0.15, Math.min(0.15, diff));
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 12;
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
      }
    }

    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.glowColor;

    if (this.type === 'BEAM') {
      const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, this.color);
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.2)');
      ctx.fillStyle = grad;
      ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
    } else if (this.type === 'MISSILE') {
      const angle = Math.atan2(this.vy, this.vx) + Math.PI / 2;
      ctx.translate(this.x, this.y);
      ctx.rotate(angle);
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      // Nose cone
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-this.width / 2, -this.height / 2);
      ctx.lineTo(0, -this.height / 2 - 4);
      ctx.lineTo(this.width / 2, -this.height / 2);
      ctx.closePath();
      ctx.fill();
    } else if (this.fromEnemy) {
      // Glowing energy orb with inner bright core
      ctx.fillStyle = this.glowColor;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.width * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Sleek energy bolt with glowing pill gradient
      const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.7, this.color);
      grad.addColorStop(1, this.glowColor);
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.roundRect(this.x - this.width / 2, this.y, this.width, this.height, 3);
      ctx.fill();
    }

    ctx.restore();
  }
}
