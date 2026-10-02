export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  type: 'SPARK' | 'SMOKE' | 'GLOW' | 'DEBRIS' | 'SHOCKWAVE' | 'WARP_LINE';
  rotation?: number;
  vRot?: number;
  ringRadius?: number;
  maxRingRadius?: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly MAX_PARTICLES = 400;

  emit(p: Particle) {
    if (this.particles.length < this.MAX_PARTICLES) {
      this.particles.push(p);
    }
  }

  emitExplosion(x: number, y: number, color: string = '#00f2ff', count: number = 24, scale: number = 1) {
    // Center Shockwave ring
    this.emit({
      x,
      y,
      vx: 0,
      vy: 0,
      size: 2,
      color,
      alpha: 0.9,
      decay: 0.04,
      type: 'SHOCKWAVE',
      ringRadius: 4 * scale,
      maxRingRadius: 45 * scale
    });

    // Secondary Sparks
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 6 + 2) * scale;
      this.emit({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1.5,
        color: Math.random() > 0.3 ? color : '#ffffff',
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02,
        type: 'SPARK'
      });
    }

    // Debris shards
    for (let i = 0; i < Math.floor(count / 4); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 4 + 1) * scale;
      this.emit({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 3,
        color: '#94a3b8',
        alpha: 1,
        decay: 0.015,
        type: 'DEBRIS',
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2
      });
    }
  }

  emitThruster(x: number, y: number, vx: number, color: string = '#06b6d4', intensity: number = 1) {
    for (let i = 0; i < intensity; i++) {
      this.emit({
        x: x + (Math.random() - 0.5) * 4,
        y: y + Math.random() * 3,
        vx: vx * 0.2 + (Math.random() - 0.5) * 1.5,
        vy: Math.random() * 4 + 4,
        size: Math.random() * 3.5 + 1.5,
        color,
        alpha: 0.8,
        decay: 0.06,
        type: 'GLOW'
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.type === 'SHOCKWAVE' && p.ringRadius !== undefined && p.maxRingRadius !== undefined) {
        p.ringRadius += (p.maxRingRadius - p.ringRadius) * 0.15;
      }
      if (p.type === 'DEBRIS' && p.rotation !== undefined && p.vRot !== undefined) {
        p.rotation += p.vRot;
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'SHOCKWAVE' && p.ringRadius) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'DEBRIS' && p.rotation !== undefined) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      } else if (p.type === 'GLOW') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}
