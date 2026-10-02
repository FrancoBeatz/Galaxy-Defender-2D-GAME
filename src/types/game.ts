export type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'WAVE_TRANSITION' | 'SHOP' | 'GAMEOVER' | 'VICTORY';

export type ShipClass = 'AEGIS' | 'VALKYRIE' | 'TITAN';

export type DifficultyMode = 'NORMAL' | 'VETERAN' | 'NIGHTMARE';

export type EnemyType = 
  | 'SCOUT'       // Fast, nimble, burst fire
  | 'SINE'        // Serpentine wave glider
  | 'DIVER'       // Stalker that locks and accelerates downward
  | 'ZIGZAG'      // Quick angular evasion
  | 'FRIGATE'     // Heavily armored gunship with spread turrets
  | 'PHANTOM'     // Cloaks & warps across lanes
  | 'ASTEROID';   // Destructible space obstacle

export type BossType = 
  | 'HARVESTER'   // Wave 3 Boss: Radial lasers & homing missiles
  | 'DREADNOUGHT' // Wave 6 Boss: Railgun beam & fighter drone bays
  | 'LEVIATHAN';  // Wave 9+ Boss: Void singularity & multi-phase rage

export type PowerUpType = 
  | 'RAPID_FIRE'    // Overcharged hyper firing rate
  | 'SPREAD_SHOT'   // 3-way or 5-way plasma spread
  | 'PHOTON_BEAM'   // Piercing high-energy beam
  | 'HOMING_MISSILES' // Seeking micro-missiles
  | 'SHIELD_REFILL' // Restores force field
  | 'CHRONO_SLOW'   // Matrix time dilation for enemies
  | 'SUPER_BOMB'    // Instant EMP screen clear
  | 'REPAIR_KIT';   // Restores hull integrity

export interface Upgrades {
  damage: number;
  fireRate: number;
  speed: number;
  maxHealth: number;
  maxShield: number;
  empCapacitor: number;
  magnetRange: number;
}

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  screenShake: boolean;
  reducedMotion: boolean;
  controlMode: 'KEYBOARD' | 'MOUSE' | 'TOUCH';
  touchSensitivity: number;
}

export interface PlayerStats {
  enemiesDefeated: number;
  shotsFired: number;
  shotsHit: number;
  bossesKilled: number;
  powerupsCollected: number;
  maxCombo: number;
  score: number;
  credits: number;
  wave: number;
  timeSurvivedSeconds: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
  size: number;
}
