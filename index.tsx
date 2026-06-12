import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import Phaser from 'phaser';
import BootScene from './src/scenes/BootScene';
import GameScene from './src/scenes/GameScene';
import { Upgrades, SpecialAbility, Mission, Achievement } from './src/types';
import { 
  Shield, 
  Zap, 
  Heart, 
  Play, 
  Pause, 
  ShoppingCart, 
  RefreshCw, 
  Trophy, 
  Target, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Award, 
  User, 
  Clock, 
  BarChart2,
  Gauge,
  Rocket
} from 'lucide-react';
import { sounds } from './src/soundGenerator';

// --- Default Persistent Models Initialization ---

const DEFAULT_UPGRADES: Upgrades = {
  damage: 1,
  fireRate: 1,
  speed: 1,
  maxHealth: 100,
  maxShield: 50,
  magnet: 1
};

const DEFAULT_ABILITIES: SpecialAbility[] = [
  {
    type: 'SHIELD_OVERCHARGE',
    name: 'Shield Supercharge',
    description: 'Instantly overcharges shields by 150% capability.',
    cooldown: 18000,
    lastUsed: 0,
    duration: 3000,
    unlocked: true,
  },
  {
    type: 'PLASMA_BLAST',
    name: 'Plasma Discharge',
    description: 'Releases a devastating radial plasma shockwave.',
    cooldown: 25000,
    lastUsed: 0,
    duration: 0,
    unlocked: false,
  },
  {
    type: 'TIME_WARP',
    name: 'Chrono Disruption',
    description: 'Temporarily warps regional physics, slowing hostiles.',
    cooldown: 35000,
    lastUsed: 0,
    duration: 4000,
    unlocked: false,
  }
];

const DEFAULT_MISSIONS: Mission[] = [
  { id: '1', description: 'Reach 5,000 points in Wave Survival mode', completed: false, currentValue: 0, targetValue: 5000, rewardCoins: 150 },
  { id: '2', description: 'Survive for 120 seconds in a single run', completed: false, currentValue: 0, targetValue: 120, rewardCoins: 200 },
  { id: '3', description: 'Collect 100 weapon upgrade power credits', completed: false, currentValue: 0, targetValue: 100, rewardCoins: 250 }
];

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', title: 'Novice Pilot', description: 'Fired your weapon 500 times.', unlocked: false, progress: 0, target: 500, rewardCoins: 100 },
  { id: 'a2', title: 'Boss Annihilator', description: 'Defeated a wave boss flagship.', unlocked: false, progress: 0, target: 1, rewardCoins: 300 },
  { id: 'a3', title: 'Elite Shielding', description: 'Unlocked Max Upgrade state for core Defensive shield.', unlocked: false, progress: 0, target: 5, rewardCoins: 400 }
];

export default function App() {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAMEOVER' | 'SHOP' | 'ACHIEVEMENTS' | 'STATS'>('MENU');
  const [isMuted, setIsMuted] = useState(false);
  const [soundIntensity, setSoundIntensity] = useState<number>(100);

  // Dynamic persistence states (saved in localStorage)
  const [upgrades, setUpgrades] = useState<Upgrades>(() => {
    const saved = localStorage.getItem('gd3d_upgrades');
    return saved ? JSON.parse(saved) : DEFAULT_UPGRADES;
  });

  const [abilities, setAbilities] = useState<SpecialAbility[]>(() => {
    const saved = localStorage.getItem('gd3d_abilities');
    return saved ? JSON.parse(saved) : DEFAULT_ABILITIES;
  });

  const [missions, setMissions] = useState<Mission[]>(() => {
    const saved = localStorage.getItem('gd3d_missions');
    return saved ? JSON.parse(saved) : DEFAULT_MISSIONS;
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('gd3d_achievements');
    return saved ? JSON.parse(saved) : DEFAULT_ACHIEVEMENTS;
  });

  // Score stats tracking
  const [sessionStats, setSessionStats] = useState<any>({
    score: 0,
    coins: 400, // baseline credits to purchase initial level weapon drops
    xp: 0,
    level: 1,
    xpNeeded: 100,
    health: 100,
    maxHealth: 100,
    shield: 50,
    maxShield: 50,
    comboCount: 0,
    bossHp: null,
    bossMaxHp: null,
    wavesCleared: 0,
  });

  const [globalStats, setGlobalStats] = useState(() => {
    const saved = localStorage.getItem('gd3d_global_stats');
    return saved ? JSON.parse(saved) : {
      highScore: 0,
      totalCoinsCollected: 400,
      gamesPlayed: 0,
      bossesDefeated: 0,
      timePlayedSeconds: 0,
    };
  });

  const [fps, setFps] = useState<number>(60);

  // Phaser Engine container binding references
  const phaserContainerRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  // FPS performance telemetry emulator
  useEffect(() => {
    const interval = setInterval(() => {
      setFps(Math.floor(Phaser.Math.Between(58, 62)));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save changes locally on update loop
  useEffect(() => {
    localStorage.setItem('gd3d_upgrades', JSON.stringify(upgrades));
  }, [upgrades]);

  useEffect(() => {
    localStorage.setItem('gd3d_abilities', JSON.stringify(abilities));
  }, [abilities]);

  useEffect(() => {
    localStorage.setItem('gd3d_missions', JSON.stringify(missions));
  }, [missions]);

  useEffect(() => {
    localStorage.setItem('gd3d_achievements', JSON.stringify(achievements));
  }, [achievements]);

  useEffect(() => {
    localStorage.setItem('gd3d_global_stats', JSON.stringify(globalStats));
  }, [globalStats]);

  // Audio mute toggling support
  const toggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    sounds.setMute(nextVal);
  };

  const handleStatsCallback = (stats: any) => {
    setSessionStats((prev: any) => ({
      ...prev,
      ...stats
    }));

    // Perform check for reactive dynamic Achievements progress
    setAchievements(prev => prev.map(ach => {
      if (ach.id === 'a1') {
        const nextProgress = Math.min(ach.target, ach.progress + 1);
        return {
          ...ach,
          progress: nextProgress,
          unlocked: nextProgress >= ach.target && !ach.unlocked
        };
      }
      return ach;
    }));
  };

  const handleGameOverCallback = (finalScore: number, finalCoins: number) => {
    setGlobalStats((prev: any) => {
      const nextHighScore = Math.max(prev.highScore, finalScore);
      const updatedTotalCoins = prev.totalCoinsCollected + finalCoins;
      const updatedGames = prev.gamesPlayed + 1;
      return {
        ...prev,
        highScore: nextHighScore,
        totalCoinsCollected: updatedTotalCoins,
        gamesPlayed: updatedGames
      };
    });

    setSessionStats((prev: any) => ({
      ...prev,
      coins: prev.coins + finalCoins
    }));

    sounds.playExplosion();
    cleanupPhaser();
    setGameState('GAMEOVER');
  };

  const handleWaveClearedCallback = (waveLevel: number) => {
    setSessionStats((prev: any) => ({
      ...prev,
      wavesCleared: waveLevel - 1
    }));
  };

  // Instantiate Phaser engine selectively inside React lifecycle containers
  const launchPhaser = () => {
    if (!phaserContainerRef.current) return;
    cleanupPhaser();

    sounds.init();
    sounds.setMute(isMuted);

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: phaserContainerRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scene: [BootScene, GameScene],
      transparent: true
    };

    const game = new Phaser.Game(config);
    phaserGameRef.current = game;

    // Immediately kick of the dynamic settings
    setTimeout(() => {
      const activeScene = game.scene.keys['GameScene'] as GameScene;
      if (activeScene) {
        game.scene.start('GameScene', {
          upgrades,
          abilities,
          currentWave: sessionStats.wavesCleared + 1,
          onStatsChange: handleStatsCallback,
          onGameOver: handleGameOverCallback,
          onWaveCleared: handleWaveClearedCallback
        });
      }
    }, 100);

    setGameState('PLAYING');
  };

  const cleanupPhaser = () => {
    if (phaserGameRef.current) {
      phaserGameRef.current.destroy(true);
      phaserGameRef.current = null;
    }
  };

  // Special ability action handler triggers directly targeting Phaser physics entities
  const triggerAbility = (abilityType: 'SHIELD_OVERCHARGE' | 'PLASMA_BLAST' | 'TIME_WARP') => {
    if (!phaserGameRef.current) return;
    const gameScene = phaserGameRef.current.scene.getScene('GameScene') as GameScene;
    if (gameScene) {
      gameScene.triggerAbility(abilityType);
    }
  };

  // Shopping system level purchases & validation logic
  const buyUpgrade = (key: keyof Upgrades, cost: number) => {
    if (sessionStats.coins >= cost) {
      setSessionStats((prev: any) => ({ ...prev, coins: prev.coins - cost }));
      setUpgrades((prev: any) => ({
        ...prev,
        [key]: prev[key] + 1
      }));
      sounds.playPowerup();
    }
  };

  const unlockAbility = (type: 'SHIELD_OVERCHARGE' | 'PLASMA_BLAST' | 'TIME_WARP', cost: number) => {
    if (sessionStats.coins >= cost) {
      setSessionStats((prev: any) => ({ ...prev, coins: prev.coins - cost }));
      setAbilities(prev => prev.map(ab => {
        if (ab.type === type) {
          return { ...ab, unlocked: true };
        }
        return ab;
      }));
      sounds.playPowerup();
    }
  };

  return (
    <div className="w-full h-full bg-[#050510] text-white relative select-none">
      
      {/* Absolute high quality 3D procedural stars background behind HUD layouts in inactive game states */}
      {gameState !== 'PLAYING' && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/35 via-slate-950/85 to-black pointer-events-none opacity-80" />
      )}

      {/* Phaser Canvas Container */}
      <div 
        ref={phaserContainerRef} 
        className={`absolute inset-0 transition-opacity duration-500 z-0 ${gameState === 'PLAYING' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Interactive React HUD System overlays */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
        
        {/* Dynamic game over overlays */}
        {gameState === 'MENU' && (
          <div className="w-full h-full pointer-events-auto flex flex-col justify-center items-center px-4 max-w-4xl mx-auto text-center gap-6">
            <div className="p-8 rounded-3xl bg-slate-900/40 backdrop-blur-2xl border border-blue-500/10 shadow-[0_0_80px_rgba(59,130,246,0.15)] flex flex-col items-center max-w-xl w-full">
              <div className="mb-4 inline-flex p-3 bg-blue-500/10 rounded-full text-blue-400">
                <Rocket size={48} className="animate-pulse" />
              </div>
              <h1 className="text-6xl font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400">
                GALAXY DEFENDER
              </h1>
              <span className="text-cyan-400 tracking-[0.5em] text-xs font-mono uppercase font-bold mb-8">
                3D ARCADE COORD
              </span>

              <button
                onClick={launchPhaser}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-2xl text-lg font-black tracking-wider uppercase transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(59,130,246,0.35)]"
              >
                INITIALIZE FIGHTER
              </button>

              <div className="grid grid-cols-2 gap-4 w-full mt-6">
                <button
                  onClick={() => setGameState('SHOP')}
                  className="py-3 px-4 bg-slate-800/60 hover:bg-slate-700/60 rounded-xl font-bold text-sm transition-colors cursor-pointer border border-white/5 flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={16} /> Weapon Command
                </button>
                <button
                  onClick={() => setGameState('ACHIEVEMENTS')}
                  className="py-3 px-4 bg-slate-800/60 hover:bg-slate-700/60 rounded-xl font-bold text-sm transition-colors cursor-pointer border border-white/5 flex items-center justify-center gap-2"
                >
                  <Trophy size={16} /> Achievements
                </button>
              </div>
            </div>

            <div className="text-xs text-white/40 tracking-[0.2em] font-mono">
              [WASD/Arrows]: Fly ship &bull; [Space]: Dual Lasers &bull; [M]: Mute Sounds
            </div>
          </div>
        )}

        {/* Play interface HUD Elements block */}
        {gameState === 'PLAYING' && (
          <div className="w-full h-full flex flex-col justify-between p-6">
            
            {/* Top Dashboard Header statistics bar */}
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="p-4 bg-slate-950/70 border border-blue-500/20 rounded-2xl backdrop-blur-md">
                  <div className="text-[9px] uppercase tracking-widest text-cyan-400/80 font-mono">Mission Score</div>
                  <div className="text-3xl font-black italic">{sessionStats.score.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-slate-950/70 border border-blue-500/20 rounded-2xl backdrop-blur-md flex flex-col justify-center">
                  <div className="text-[9px] uppercase tracking-widest text-purple-400 font-mono">XP LEVEL</div>
                  <div className="text-xl font-bold flex items-center gap-1">
                    {sessionStats.level} <span className="text-xs font-mono text-purple-300">({Math.floor(sessionStats.xp / sessionStats.xpNeeded * 100)}%)</span>
                  </div>
                </div>
              </div>

              {/* Central warning for active Boss Battle coordinates */}
              {sessionStats.bossHp !== null && (
                <div className="flex flex-col items-center bg-pink-950/30 border border-pink-500/30 p-4 rounded-2xl backdrop-blur-lg animate-pulse max-w-sm w-full select-none">
                  <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-pink-400">WARNING: SIGNATURE DETECTED</div>
                  <div className="w-full h-2 bg-pink-950/50 rounded-full mt-2 overflow-hidden border border-pink-500/30">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-600 to-red-500"
                      style={{ width: `${(sessionStats.bossHp / sessionStats.bossMaxHp) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Combo counters & settings toggles */}
              <div className="flex items-start gap-4">
                {sessionStats.comboCount > 0 && (
                  <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl backdrop-blur-md animate-bounce text-center">
                    <div className="text-[9px] uppercase tracking-widest text-cyan-400 font-mono">COMBO</div>
                    <div className="text-2xl font-black italic text-cyan-300">{sessionStats.comboCount}X</div>
                  </div>
                )}
                
                <div className="p-4 bg-slate-950/70 border border-blue-500/20 rounded-2xl backdrop-blur-md">
                  <div className="text-[9px] uppercase tracking-widest text-yellow-400 font-mono font-bold">Credits</div>
                  <div className="text-xl font-bold text-yellow-300">{sessionStats.coins}</div>
                </div>

                <div className="flex flex-col gap-2 pointer-events-auto">
                  <button 
                    onClick={toggleMute}
                    className="p-3 bg-slate-900/80 hover:bg-slate-800 rounded-xl border border-white/10 transition-colors pointer-events-auto cursor-pointer"
                  >
                    {isMuted ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} />}
                  </button>
                  <button 
                    onClick={() => {
                      cleanupPhaser();
                      setGameState('MENU');
                    }}
                    className="p-3 bg-red-950/40 hover:bg-red-900 border border-red-500/20 rounded-xl transition-colors pointer-events-auto cursor-pointer flex items-center justify-center"
                  >
                    <Pause size={18} className="text-red-300" />
                  </button>
                </div>
              </div>
            </div>

            {/* Middle telemetry indicator panels */}
            <div className="flex justify-between items-end">
              
              {/* Special Ability trigger controllers */}
              <div className="flex gap-3 pointer-events-auto">
                {abilities.map((ab) => (
                  <button
                    key={ab.type}
                    onClick={() => ab.unlocked && triggerAbility(ab.type)}
                    disabled={!ab.unlocked}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-1 transition-all duration-300 transform active:scale-95 ${
                      ab.unlocked 
                        ? 'bg-slate-950/80 border-blue-500/30 hover:border-cyan-400/60 cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                        : 'bg-black/80 border-white/5 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-blue-400">
                      {ab.type === 'SHIELD_OVERCHARGE' && <Shield size={20} />}
                      {ab.type === 'PLASMA_BLAST' && <Zap size={20} />}
                      {ab.type === 'TIME_WARP' && <Clock size={20} />}
                    </div>
                    <span className="text-[9px] font-mono font-bold text-white uppercase tracking-wider">{ab.name}</span>
                  </button>
                ))}
              </div>

              {/* Health and Shield core gauges */}
              <div className="max-w-md w-full flex flex-col gap-3 p-5 rounded-2xl bg-slate-950/80 border border-blue-500/20 backdrop-blur-md">
                
                {/* Shield integrity gauge */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                    <span className="flex items-center gap-1"><Shield size={12} /> Kinetic Deflectors</span>
                    <span>{Math.floor(sessionStats.shield)} / {sessionStats.maxShield}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                    <div 
                      className="h-full bg-cyan-400 transition-all duration-150"
                      style={{ width: `${(sessionStats.shield / sessionStats.maxShield) * 100}%`, boxShadow: '0 0 10px #22d3ee' }}
                    />
                  </div>
                </div>

                {/* Direct health stability integrity */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-red-400">
                    <span className="flex items-center gap-1"><Heart size={12} fill="currentColor" /> Hull Stability</span>
                    <span>{Math.floor(sessionStats.health)} / {sessionStats.maxHealth}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                    <div 
                      className="h-full bg-red-500 transition-all duration-150"
                      style={{ width: `${(sessionStats.health / sessionStats.maxHealth) * 100}%`, boxShadow: '0 0 10px #ef4444' }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between text-[9px] text-white/40 font-mono tracking-widest uppercase mt-1">
                  <span>TELEMETRY: FLUSH_OK </span>
                  <span className="flex items-center gap-1 text-green-400"><Gauge size={12} /> {fps} FPS</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Command Center Upgrade Store window */}
        {gameState === 'SHOP' && (
          <div className="w-full h-full pointer-events-auto flex flex-col justify-center items-center p-4">
            <div className="p-8 rounded-3xl bg-slate-950/90 border border-blue-500/20 max-w-4xl w-full flex flex-col max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-black tracking-tight flex items-center gap-2 text-cyan-400">
                    <ShoppingCart /> WEAPONS BAY & ARMORY
                  </h2>
                  <p className="text-xs text-white/40">Upgrade ship capabilities using collected mission power credits.</p>
                </div>
                <div className="py-2 px-4 bg-slate-900 rounded-xl border border-white/5 font-bold text-yellow-300">
                  {sessionStats.coins} Credits
                </div>
              </div>

              {/* Upgrade metrics parameters columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Armory metrics list */}
                <div className="space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-blue-400 font-bold border-b border-white/5 pb-2">Active Upgrades</h3>
                  
                  {/* Weapon damage tier */}
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm">Weapon Damage Tier</div>
                      <div className="text-xs text-white/40">Improves bullet impact indices. Level {upgrades.damage}</div>
                    </div>
                    <button
                      onClick={() => buyUpgrade('damage', upgrades.damage * 75)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded-lg text-xs font-bold transition-all"
                    >
                      Buy ({upgrades.damage * 75}C)
                    </button>
                  </div>

                  {/* Firing index standard upgrades */}
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm">Target Firing Velocity</div>
                      <div className="text-xs text-white/40">Decelerates firing loop delays. Level {upgrades.fireRate}</div>
                    </div>
                    <button
                      onClick={() => buyUpgrade('fireRate', upgrades.fireRate * 90)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded-lg text-xs font-bold transition-all"
                    >
                      Buy ({upgrades.fireRate * 90}C)
                    </button>
                  </div>

                  {/* Engine speed boost levels */}
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm">Thruster Propulsion Rate</div>
                      <div className="text-xs text-white/40">Increases dodge swiftness. Level {upgrades.speed}</div>
                    </div>
                    <button
                      onClick={() => buyUpgrade('speed', upgrades.speed * 60)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded-lg text-xs font-bold transition-all"
                    >
                      Buy ({upgrades.speed * 60}C)
                    </button>
                  </div>
                </div>

                {/* Tech tree unlocked abilities branch column */}
                <div className="space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-purple-400 font-bold border-b border-white/5 pb-2">Unlock Special Abilities</h3>
                  {abilities.map(ab => (
                    <div key={ab.type} className="p-4 bg-slate-900/60 rounded-xl border border-white/5 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-sm flex items-center gap-1.5">
                          {ab.name} {ab.unlocked && <span className="text-[10px] text-green-400 bg-green-950/40 px-2 py-0.5 rounded-full border border-green-500/20">Unlocked</span>}
                        </div>
                        <div className="text-xs text-white/40">{ab.description}</div>
                      </div>
                      {!ab.unlocked && (
                        <button
                          onClick={() => unlockAbility(ab.type, 200)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-bold transition-all"
                        >
                          Unlock (200C)
                        </button>
                      )}
                    </div>
                  ))}
                </div>

              </div>

              <button
                onClick={() => setGameState('MENU')}
                className="mt-8 py-3 bg-white hover:bg-slate-200 text-black font-bold rounded-xl transition-all font-mono tracking-widest text-xs uppercase"
              >
                RETURN TO BRIDGE
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Achievements View layout overlay */}
        {gameState === 'ACHIEVEMENTS' && (
          <div className="w-full h-full pointer-events-auto flex flex-col justify-center items-center p-4">
            <div className="p-8 rounded-3xl bg-slate-950/90 border border-blue-500/20 max-w-2xl w-full flex flex-col max-h-[80vh] overflow-y-auto">
              <h2 className="text-3xl font-black tracking-tight text-cyan-400 flex items-center gap-2 mb-6">
                <Trophy /> PILOT DIPLOMAS & ACHIEVEMENTS
              </h2>

              <div className="space-y-4">
                {achievements.map((ach) => (
                  <div 
                    key={ach.id} 
                    className={`p-4 rounded-2xl border transition-all ${
                      ach.unlocked 
                        ? 'bg-blue-950/25 border-blue-500/30' 
                        : 'bg-slate-900/60 border-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-base flex items-center gap-1.5">
                          {ach.title} {ach.unlocked && <span className="text-xs text-yellow-300">Awarded</span>}
                        </h3>
                        <p className="text-xs text-white/50">{ach.description}</p>
                      </div>
                      <div className="text-xs font-mono text-cyan-300">
                        {ach.progress} / {ach.target}
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="h-full bg-cyan-400" 
                        style={{ width: `${(ach.progress / ach.target) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setGameState('MENU')}
                className="mt-8 py-3 bg-white hover:bg-slate-200 text-black font-bold rounded-xl transition-all font-mono tracking-widest text-xs uppercase"
              >
                RETURN TO BRIDGE
              </button>
            </div>
          </div>
        )}

        {/* Dynamic game over overlays */}
        {gameState === 'GAMEOVER' && (
          <div className="w-full h-full pointer-events-auto flex flex-col justify-center items-center px-4 max-w-4xl mx-auto text-center gap-6">
            <div className="p-8 rounded-3xl bg-red-950/10 backdrop-blur-2xl border border-red-500/20 flex flex-col items-center max-w-xl w-full">
              <h2 className="text-5xl font-black text-red-500 italic mb-2">MISSION FAILURE</h2>
              <p className="text-xs text-white/50 uppercase tracking-widest font-mono mb-8">HULL COMPROMISED BEYOND REPAIR</p>

              <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5">
                  <div className="text-[10px] text-white/40 uppercase font-mono tracking-widest">Final Score</div>
                  <div className="text-2xl font-bold">{sessionStats.score.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5">
                  <div className="text-[10px] text-white/40 uppercase font-mono tracking-widest">Power Credits</div>
                  <div className="text-2xl font-bold">{sessionStats.coins}</div>
                </div>
              </div>

              <button
                onClick={launchPhaser}
                className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-black tracking-wider text-sm font-mono uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
              >
                REDEPLOY FIGHTER <RefreshCw size={16} />
              </button>

              <button
                onClick={() => setGameState('MENU')}
                className="mt-3 w-full py-3 bg-slate-800/60 hover:bg-slate-700/60 border border-white/5 text-xs text-white/70 font-mono uppercase tracking-widest rounded-xl transition-all"
              >
                Abandon Mission Coordinates
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
