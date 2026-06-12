export interface Upgrades {
  damage: number;     // multiplier / level
  fireRate: number;   // level
  speed: number;      // level
  maxHealth: number;  // level
  maxShield: number;  // level
  magnet: number;     // level for picking up coins/xp
}

export interface PlayerStats {
  score: number;
  highScore: number;
  coins: number;
  xp: number;
  level: number;
  xpNeeded: number;
  wavesCleared: number;
  comboCount: number;
  maxCombo: number;
  gamesPlayed: number;
  totalEnemiesDefeated: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
  rewardCoins: number;
}

export type SpecialAbilityType = 'SHIELD_OVERCHARGE' | 'PLASMA_BLAST' | 'TIME_WARP';

export interface SpecialAbility {
  type: SpecialAbilityType;
  name: string;
  description: string;
  cooldown: number; // millisecond cooldown
  lastUsed: number;  // high res timestamp
  duration: number; // active duration
  unlocked: boolean;
}

export interface Mission {
  id: string;
  description: string;
  completed: boolean;
  currentValue: number;
  targetValue: number;
  rewardCoins: number;
}
