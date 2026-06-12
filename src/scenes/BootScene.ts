import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // We design high fidelity procedural shapes and animations directly via custom graphics textures.
    // This allows us to load quickly, prevent asset loading errors on dynamic servers, and create flawless procedural glows.
  }

  create() {
    // Generate high quality glows, designs, particle layers dynamically
    this.createProceduralTextures();
    this.scene.start('GameScene');
  }

  private createProceduralTextures() {
    // --- Player Ship Procedural Design ---
    let graphics = this.make.graphics();
    graphics.fillStyle(0x00f2ff, 1);
    graphics.lineStyle(2, 0xffffff, 1);
    
    // Draw an ultra premium triangular futuristic starfighter with wings
    graphics.beginPath();
    graphics.moveTo(24, 0);   // Nose tip
    graphics.lineTo(44, 38);  // Right wingtip
    graphics.lineTo(34, 32);  // Inside wing cutout right
    graphics.lineTo(24, 44);  // Rear center engine cutout
    graphics.lineTo(14, 32);  // Inside wing cutout left
    graphics.lineTo(4, 38);   // Left wingtip
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();

    // Thrust injector glow
    graphics.fillStyle(0xffea00, 1);
    graphics.fillRect(21, 38, 6, 6);
    graphics.generateTexture('playerShip', 48, 48);

    // --- Red Fighter Enemy ---
    graphics.clear();
    graphics.fillStyle(0xff0044, 1);
    graphics.lineStyle(1, 0xffffff, 0.8);
    // Angular bat-wing alien design
    graphics.moveTo(20, 0);
    graphics.lineTo(36, 12);
    graphics.lineTo(40, 28);
    graphics.lineTo(28, 20);
    graphics.lineTo(20, 32);
    graphics.lineTo(12, 20);
    graphics.lineTo(0, 28);
    graphics.lineTo(4, 12);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
    graphics.generateTexture('enemyFighter', 40, 40);

    // --- Yellow Scout Enemy ---
    graphics.clear();
    graphics.fillStyle(0xffea00, 1);
    graphics.lineStyle(1, 0xffffff, 0.8);
    // Diamond shape alien scout
    graphics.moveTo(20, 0);
    graphics.lineTo(32, 16);
    graphics.lineTo(20, 32);
    graphics.lineTo(8, 16);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
    graphics.generateTexture('enemyScout', 40, 40);

    // --- Orange Heavy Tank Enemy ---
    graphics.clear();
    graphics.fillStyle(0xff7700, 1);
    graphics.lineStyle(2, 0xffffff, 0.9);
    // Hexagonal armored bulky alien
    graphics.moveTo(10, 0);
    graphics.lineTo(30, 0);
    graphics.lineTo(40, 15);
    graphics.lineTo(34, 36);
    graphics.lineTo(6, 36);
    graphics.lineTo(0, 15);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
    graphics.generateTexture('enemyHeavy', 40, 40);

    // --- Pink Kamikaze Drone ---
    graphics.clear();
    graphics.fillStyle(0xff00ea, 1);
    // Sharp spike alien kamikaze
    graphics.moveTo(16, 0);
    graphics.lineTo(32, 16);
    graphics.lineTo(24, 32);
    graphics.lineTo(16, 18);
    graphics.lineTo(8, 32);
    graphics.lineTo(0, 16);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture('enemyKamikaze', 32, 32);

    // --- Cyan Elite Ship ---
    graphics.clear();
    graphics.fillStyle(0x00ffcc, 1);
    graphics.lineStyle(2, 0xffffff, 0.9);
    // Triple prong advanced strike ship
    graphics.moveTo(20, 0);
    graphics.lineTo(30, 10);
    graphics.lineTo(40, 6);
    graphics.lineTo(32, 26);
    graphics.lineTo(20, 36);
    graphics.lineTo(8, 26);
    graphics.lineTo(0, 6);
    graphics.lineTo(10, 10);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
    graphics.generateTexture('enemyElite', 40, 40);

    // --- Projectile Types ---
    // Cyan Standard Laser
    graphics.clear();
    graphics.fillStyle(0x00f2ff, 1);
    graphics.fillRect(4, 0, 4, 16);
    graphics.generateTexture('cyanLaser', 12, 16);

    // Pink Enemy Bullet
    graphics.clear();
    graphics.fillStyle(0xff0044, 1);
    graphics.fillRect(4, 0, 4, 12);
    graphics.generateTexture('enemyLaser', 12, 12);

    // Plasma Ball
    graphics.clear();
    graphics.fillStyle(0xffea00, 1);
    graphics.fillCircle(12, 12, 8);
    graphics.generateTexture('plasmaBall', 24, 24);

    // Shield Dome texture (rendered for visual effects overlay)
    graphics.clear();
    graphics.lineStyle(3, 0x00f2ff, 1);
    graphics.strokeCircle(32, 32, 28);
    graphics.generateTexture('shieldBubble', 64, 64);

    // Coin/Currency (spinning look)
    graphics.clear();
    graphics.fillStyle(0xffea00, 1);
    graphics.lineStyle(1, 0xffffff, 1);
    graphics.fillCircle(12, 12, 8);
    graphics.strokeCircle(12, 12, 8);
    graphics.generateTexture('coinTexture', 24, 24);

    // XP Gem
    graphics.clear();
    graphics.fillStyle(0xa855f7, 1);
    graphics.lineStyle(1, 0xffffff, 1);
    graphics.moveTo(10, 0);
    graphics.lineTo(20, 10);
    graphics.lineTo(10, 20);
    graphics.lineTo(0, 10);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
    graphics.generateTexture('xpGem', 20, 20);

    // --- Procedural Star and Particle Textures ---
    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(2, 2, 2);
    graphics.generateTexture('starParticle', 4, 4);

    graphics.clear();
    graphics.fillStyle(0xffa500, 1);
    graphics.fillCircle(4, 4, 3);
    graphics.generateTexture('fireParticle', 8, 8);

    graphics.clear();
    graphics.fillStyle(0x8bc34a, 1);
    graphics.fillCircle(4, 4, 3);
    graphics.generateTexture('healParticle', 8, 8);
  }
}
