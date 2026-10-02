import React, { useState } from 'react';
import { Play, Shield, Zap, Crosshair, Volume2, VolumeX, Settings as SettingsIcon } from 'lucide-react';
import { ShipClass, DifficultyMode } from '../../types/game';
import { DecryptedText } from './DecryptedText';

interface StartMenuProps {
  onStartGame: (shipClass: ShipClass, difficulty: DifficultyMode) => void;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({
  onStartGame,
  highScore,
  isMuted,
  onToggleMute,
  onOpenSettings
}) => {
  const [selectedShip, setSelectedShip] = useState<ShipClass>('AEGIS');
  const [difficulty, setDifficulty] = useState<DifficultyMode>('NORMAL');

  const ships: { id: ShipClass; name: string; desc: string; stats: { speed: number; armor: number; fire: number }; color: string }[] = [
    {
      id: 'AEGIS',
      name: 'AEGIS INTERCEPTOR',
      desc: 'Balanced tactical starfighter with twin plasma cannons and high agility.',
      stats: { speed: 8, armor: 7, fire: 7 },
      color: 'border-cyan-500 text-cyan-400'
    },
    {
      id: 'VALKYRIE',
      name: 'VALKYRIE STRIKER',
      desc: 'High-speed attack craft specializing in rapid spread fire and hyper maneuvers.',
      stats: { speed: 10, armor: 5, fire: 9 },
      color: 'border-rose-500 text-rose-400'
    },
    {
      id: 'TITAN',
      name: 'TITAN DREADNOUGHT',
      desc: 'Heavy reinforced chassis with oversized shields and devastating railgun cannons.',
      stats: { speed: 6, armor: 10, fire: 8 },
      color: 'border-blue-500 text-blue-400'
    }
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between p-4 sm:p-8 bg-slate-950/85 backdrop-blur-md z-30 overflow-y-auto">
      {/* Top Bar */}
      <div className="flex justify-between items-center w-full max-w-5xl">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-mono text-xs text-slate-400 tracking-wider">DEFENSE GRID // ONLINE</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMute}
            aria-label="Toggle Audio"
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Title Hero */}
      <div className="flex flex-col items-center text-center my-auto py-4">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-200 to-cyan-500 font-mono drop-shadow-[0_0_25px_rgba(6,182,212,0.8)]">
          GALAXY DEFENDER
        </h1>
        <div className="mt-2 text-xs sm:text-sm text-cyan-300 tracking-[0.3em] uppercase">
          <DecryptedText text="NEON STRIKE // SPACE DEFENSE SYSTEM 2026" speed={25} />
        </div>

        {highScore > 0 && (
          <div className="mt-4 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-cyan-300 tabular-nums">
            SECTOR RECORD: <span className="font-bold text-white">{highScore.toLocaleString()} PTS</span>
          </div>
        )}

        {/* Ship Hangar Selector */}
        <div className="mt-8 w-full max-w-4xl">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">SELECT STARFIGHTER CHASSIS</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ships.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedShip(s.id)}
                className={`p-4 rounded-xl text-left border transition-all duration-200 ${
                  selectedShip === s.id
                    ? `bg-slate-900/90 ${s.color} shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-[1.02]`
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono font-bold text-sm text-white">{s.name}</span>
                  {selectedShip === s.id && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{s.desc}</p>
                <div className="space-y-1.5 text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">SPEED</span>
                    <span className="text-slate-300">{s.stats.speed}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ARMOR</span>
                    <span className="text-slate-300">{s.stats.armor}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">FIREPOWER</span>
                    <span className="text-slate-300">{s.stats.fire}/10</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Controls */}
        <div className="mt-6 flex items-center gap-2">
          {(['NORMAL', 'VETERAN', 'NIGHTMARE'] as DifficultyMode[]).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                difficulty === d
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Launch Button */}
        <div className="mt-8">
          <button
            onClick={() => onStartGame(selectedShip, difficulty)}
            className="px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 text-slate-950 font-mono font-bold text-base sm:text-lg tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.8)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            INITIALIZE MISSION
          </button>
        </div>
      </div>

      {/* Footer Controls Cheatsheet */}
      <div className="w-full max-w-2xl border-t border-slate-800/80 pt-3 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-500">
        <span><b className="text-slate-300">[WASD / ARROWS]</b> STRAFE</span>
        <span>&bull;</span>
        <span><b className="text-slate-300">[SPACE / CLICK]</b> FIRE LASERS</span>
        <span>&bull;</span>
        <span><b className="text-slate-300">[SHIFT / K]</b> EMP BLAST</span>
        <span>&bull;</span>
        <span><b className="text-slate-300">[P]</b> PAUSE</span>
      </div>
    </div>
  );
};
