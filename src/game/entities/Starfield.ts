interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  layer: number;
  alpha: number;
  color: string;
}

interface NebulaCloud {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
}

export class Starfield {
  private stars: Star[] = [];
  private clouds: NebulaCloud[] = [];
  private warpFactor: number = 1.0;
  private width: number = 800;
  private height: number = 600;

  init(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.stars = [];
    this.clouds = [];

    const starCount = Math.floor((width * height) / 3200);
    const starColors = ['#ffffff', '#bae6fd', '#fef08a', '#fbcfe8', '#c7d2fe'];

    for (let i = 0; i < starCount; i++) {
      const layer = Math.floor(Math.random() * 3); // 0=distant, 1=mid, 2=near
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: layer === 0 ? 1 : layer === 1 ? 1.5 : 2.2,
        speed: (layer + 1) * 0.75,
        layer,
        alpha: layer === 0 ? 0.4 : layer === 1 ? 0.75 : 1.0,
        color: starColors[Math.floor(Math.random() * starColors.length)]
      });
    }

    // Procedural nebula dust clouds
    const cloudColors = [
      'rgba(56, 189, 248, 0.04)',
      'rgba(168, 85, 247, 0.04)',
      'rgba(236, 72, 153, 0.03)',
      'rgba(34, 211, 238, 0.03)'
    ];

    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 200 + 150,
        color: cloudColors[i % cloudColors.length],
        speed: 0.2 + Math.random() * 0.15
      });
    }
  }

  setWarp(factor: number) {
    this.warpFactor = factor;
  }

  update() {
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.y += s.speed * this.warpFactor;
      if (s.y > this.height) {
        s.y = 0;
        s.x = Math.random() * this.width;
      }
    }

    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.y += c.speed * this.warpFactor;
      if (c.y - c.radius > this.height) {
        c.y = -c.radius;
        c.x = Math.random() * this.width;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw Nebula clouds
    ctx.save();
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius);
      grad.addColorStop(0, c.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Draw Stars with warp streaking
    ctx.save();
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;

      if (this.warpFactor > 1.8) {
        // Warp streak
        const streakLength = s.speed * this.warpFactor * 2.5;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x, s.y + streakLength);
        ctx.stroke();
      } else {
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
