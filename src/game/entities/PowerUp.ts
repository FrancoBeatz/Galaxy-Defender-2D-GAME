import { PowerUpType } from '../../types/game';

export class PowerUp {
  x: number;
  y: number;
  width: number = 32;
  height: number = 32;
  type: PowerUpType;
  pulse: number = 0;
  rotation: number = 0;
  color: string;
  glowColor: string;
  label: string;

  constructor(x: number, y: number, type: PowerUpType) {
    this.x = x;
    this.y = y;
    this.type = type;

    switch (type) {
      case 'RAPID_FIRE':
        this.color = '#f43f5e';
        this.glowColor = '#e11d48';
        this.label = '⚡';
        break;
      case 'SPREAD_SHOT':
        this.color = '#c084fc';
        this.glowColor = '#a855f7';
        this.label = '✦';
        break;
      case 'PHOTON_BEAM':
        this.color = '#38bdf8';
        this.glowColor = '#0284c7';
        this.label = '═';
        break;
      case 'HOMING_MISSILES':
        this.color = '#facc15';
        this.glowColor = '#eab308';
        this.label = '▲';
        break;
      case 'SHIELD_REFILL':
        this.color = '#60a5fa';
        this.glowColor = '#3b82f6';
        this.label = '🛡';
        break;
      case 'CHRONO_SLOW':
        this.color = '#34d399';
        this.glowColor = '#10b981';
        this.label = '⏳';
        break;
      case 'SUPER_BOMB':
        this.color = '#fb923c';
        this.glowColor = '#f97316';
        this.label = '💥';
        break;
      case 'REPAIR_KIT':
      default:
        this.color = '#4ade80';
        this.glowColor = '#22c55e';
        this.label = '✚';
        break;
    }
  }

  update(playerX?: number, playerY?: number, magnetRange: number = 0) {
    this.pulse += 0.08;
    this.rotation += 0.03;

    // Magnetic attraction to player if within range
    if (playerX !== undefined && playerY !== undefined && magnetRange > 0) {
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < magnetRange && dist > 1) {
        this.x += (dx / dist) * 7;
        this.y += (dy / dist) * 7;
        return;
      }
    }

    this.y += 1.6;
    this.x += Math.sin(this.pulse) * 0.6;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation);

    const scale = 1 + Math.sin(this.pulse) * 0.12;
    ctx.scale(scale, scale);

    // Glowing diamond crystal container
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.glowColor;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2);
    ctx.lineTo(this.width / 2, 0);
    ctx.lineTo(0, this.height / 2);
    ctx.lineTo(-this.width / 2, 0);
    ctx.closePath();
    ctx.stroke();

    // Inner translucent fill
    ctx.fillStyle = this.color + '33';
    ctx.fill();

    // Reset rotation for text label so it stays readable
    ctx.rotate(-this.rotation);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, 0, 0);

    ctx.restore();
  }
}
