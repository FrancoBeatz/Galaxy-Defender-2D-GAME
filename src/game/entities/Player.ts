import { ShipClass, PowerUpType } from '../../types/game';

export class Player {
  x: number;
  y: number;
  w: number = 44;
  h: number = 44;
  vx: number = 0;
  vy: number = 0;
  tiltAngle: number = 0;
  shipClass: ShipClass = 'AEGIS';

  hp: number = 100;
  maxHp: number = 100;
  shield: number = 50;
  maxShield: number = 50;
  invulnerableTimer: number = 0;
  shieldRechargeTimer: number = 0;

  empCharge: number = 100; // 0 - 100%
  empReady: boolean = true;

  // Active temporary powerup timers
  rapidFireTimer: number = 0;
  spreadShotTimer: number = 0;
  photonBeamTimer: number = 0;
  missileTimer: number = 0;
  chronoSlowTimer: number = 0;

  constructor(canvasWidth: number, canvasHeight: number, shipClass: ShipClass = 'AEGIS') {
    this.shipClass = shipClass;
    this.x = canvasWidth / 2 - this.w / 2;
    this.y = canvasHeight - 120;
    this.applyClassStats(shipClass);
  }

  applyClassStats(shipClass: ShipClass) {
    this.shipClass = shipClass;
    if (shipClass === 'VALKYRIE') {
      this.w = 40;
      this.h = 42;
    } else if (shipClass === 'TITAN') {
      this.w = 48;
      this.h = 46;
      this.maxShield = 80;
      this.shield = 80;
    } else {
      this.w = 44;
      this.h = 44;
      this.maxShield = 50;
      this.shield = 50;
    }
  }

  update(canvasWidth: number, canvasHeight: number, speedBonus: number = 1) {
    // Apply inertia & banking
    this.vx *= 0.86;
    this.vy *= 0.86;

    this.x += this.vx * speedBonus;
    this.y += this.vy * speedBonus;

    // Constrain within game boundaries
    this.x = Math.max(10, Math.min(canvasWidth - this.w - 10, this.x));
    this.y = Math.max(60, Math.min(canvasHeight - this.h - 20, this.y));

    // Smooth banking tilt (-20 deg to +20 deg)
    const targetTilt = (this.vx / 10) * 0.35;
    this.tiltAngle += (targetTilt - this.tiltAngle) * 0.2;

    // Timers
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;
    if (this.rapidFireTimer > 0) this.rapidFireTimer--;
    if (this.spreadShotTimer > 0) this.spreadShotTimer--;
    if (this.photonBeamTimer > 0) this.photonBeamTimer--;
    if (this.missileTimer > 0) this.missileTimer--;
    if (this.chronoSlowTimer > 0) this.chronoSlowTimer--;

    // Shield passive regeneration
    this.shieldRechargeTimer++;
    if (this.shieldRechargeTimer > 180 && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 0.15);
    }
  }

  takeDamage(amount: number): { shieldAbsorbed: boolean; damageDealt: number; isDestroyed: boolean } {
    if (this.invulnerableTimer > 0) {
      return { shieldAbsorbed: false, damageDealt: 0, isDestroyed: false };
    }

    this.shieldRechargeTimer = 0;
    this.invulnerableTimer = 60; // 1 second immunity

    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
        return { shieldAbsorbed: true, damageDealt: amount, isDestroyed: false };
      } else {
        const remaining = amount - this.shield;
        this.shield = 0;
        this.hp = Math.max(0, this.hp - remaining);
        return { shieldAbsorbed: true, damageDealt: amount, isDestroyed: this.hp <= 0 };
      }
    }

    this.hp = Math.max(0, this.hp - amount);
    return { shieldAbsorbed: false, damageDealt: amount, isDestroyed: this.hp <= 0 };
  }

  applyPowerUp(type: PowerUpType) {
    switch (type) {
      case 'RAPID_FIRE':
        this.rapidFireTimer = 480; // 8 seconds
        break;
      case 'SPREAD_SHOT':
        this.spreadShotTimer = 480;
        break;
      case 'PHOTON_BEAM':
        this.photonBeamTimer = 420;
        break;
      case 'HOMING_MISSILES':
        this.missileTimer = 480;
        break;
      case 'SHIELD_REFILL':
        this.shield = this.maxShield;
        break;
      case 'CHRONO_SLOW':
        this.chronoSlowTimer = 360;
        break;
      case 'SUPER_BOMB':
        this.empCharge = 100;
        break;
      case 'REPAIR_KIT':
        this.hp = Math.min(this.maxHp, this.hp + 35);
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
    ctx.rotate(this.tiltAngle);

    // Invulnerability flashing
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // High Quality Sci-Fi Fighter Vector Silhouette
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.shipClass === 'TITAN' ? '#38bdf8' : this.shipClass === 'VALKYRIE' ? '#f43f5e' : '#06b6d4';

    // Outer Plating
    ctx.strokeStyle = this.shipClass === 'TITAN' ? '#38bdf8' : this.shipClass === 'VALKYRIE' ? '#fb7185' : '#22d3ee';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    // Nose
    ctx.moveTo(0, -this.h / 2);
    // Right wing
    ctx.lineTo(this.w / 2, this.h / 3);
    ctx.lineTo(this.w / 3, this.h / 2);
    // Rear engine notch
    ctx.lineTo(this.w / 6, this.h / 3);
    ctx.lineTo(-this.w / 6, this.h / 3);
    // Left wing
    ctx.lineTo(-this.w / 3, this.h / 2);
    ctx.lineTo(-this.w / 2, this.h / 3);
    ctx.closePath();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fill();
    ctx.stroke();

    // Canopy Cockpit glass
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -this.h / 4);
    ctx.lineTo(5, 2);
    ctx.lineTo(0, 8);
    ctx.lineTo(-5, 2);
    ctx.closePath();
    ctx.fill();

    // Dual Ion Engine exhausts
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(-this.w / 4, this.h / 3 - 2, 4, 4);
    ctx.fillRect(this.w / 4 - 4, this.h / 3 - 2, 4, 4);

    // Dynamic Force Field Shield
    if (this.shield > 0) {
      const shieldRatio = this.shield / this.maxShield;
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + shieldRatio * 0.4})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, this.w * 0.72, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
