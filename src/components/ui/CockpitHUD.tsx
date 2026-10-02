import React from 'react';
import { Shield, Heart, Zap, Bomb, Pause, Volume2, VolumeX } from 'lucide-react';
import { Player } from '../../game/entities/Player';
import { Boss } from '../../game/entities/Boss';

interface CockpitHUDProps {
  player: Player;
  score: number;
  highScore: number;
  credits: number;
  wave: number;
  combo: number;
  comboTimer: number;
  boss: Boss | null;
  onPause: () => void;
  onTriggerEMP: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const CockpitHUD: React.FC<CockpitHUDProps> = ({
  player,
  score,
  highScore,
  credits,
  wave,
  combo,
  comboTimer,
  boss,
  onPause,
  onTriggerEMP,
  isMuted,
  onToggleMute
}) => {
  const hpRatio = Math.max(0, Math.min(1, player.hp / player.maxHp));
  const shieldRatio = player.maxShield > 0 ? Math.max(0, Math.min(1, player.shield / player.maxShield)) : 0;
  const empRatio = Math.max(0, Math.min(1, player.empCharge / 100));

  const activePowerUps = [
    { label: 'RAPID FIRE', active: player.rapidFireTimer > 0, ratio: player.rapidFireTimer / 480, color: '#f43f5e' },
    { label: 'SPREAD SHOT', active: player.spreadShotTimer > 0, ratio: player.spreadShotTimer / 480, color: '#c084fc' },
    { label: 'PHOTON BEAM', active: player.photonBeamTimer > 0, ratio: player.photonBeamTimer / 420, color: '#38bdf8' },
    { label: 'HOMING MISSILES', active: player.missileTimer > 0, ratio: player.missileTimer / 480, color: '#facc15' },
    { label: 'CHRONO SLOW', active: player.chronoSlowTimer > 0, ratio: player.chronoSlowTimer / 360, color: '#34d399' }
  ].filter(p => p.active);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 z-20">
      {/* Top Telemetry Header */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Hull & Shield Gauges */}
        <div className="flex flex-col gap-1.5 w-48 sm:w-60 bg-slate-900/80 backdrop-blur-md p-2.5 rounded-lg border border-cyan-500/30 shadow-lg">
          {/* Hull Bar */}
          <div className="flex items-center gap-2">
            <Heart className={`w-3.5 h-3.5 ${hpRatio < 0.3 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`} />
            <div className="flex-1 bg-slate-950/80 h-2 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-200 ${
                  hpRatio > 0.5 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : hpRatio > 0.25 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${hpRatio * 100}%` }}
              />
            </div>
            <span className="font-mono text-xs tabular-nums text-slate-300 w-10 text-right">
              {Math.ceil(player.hp)}
            </span>
          </div>

          {/* Shield Bar */}
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <div className="flex-1 bg-slate-950/80 h-2 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-200"
                style={{ width: `${shieldRatio * 100}%` }}
              />
            </div>
            <span className="font-mono text-xs tabular-nums text-cyan-300 w-10 text-right">
              {Math.ceil(player.shield)}
            </span>
          </div>
        </div>

        {/* Center: Sector Wave Info & Boss Meter */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-700/60 shadow-md flex items-center gap-2">
            <span className="text-[10px] sm:text-xs tracking-widest text-slate-400 font-semibold uppercase">SECTOR</span>
            <span className="font-mono font-bold text-sm sm:text-base text-cyan-400 tabular-nums">WAVE {wave}</span>
          </div>

          {/* Boss Bar if active */}
          {boss && boss.hp > 0 && (
            <div className="mt-2 w-64 sm:w-80 bg-slate-950/90 backdrop-blur-md p-2 rounded-lg border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse">
              <div className="flex justify-between items-center text-[10px] font-mono font-bold text-red-400 tracking-wider mb-1">
                <span>{boss.name}</span>
                <span className="tabular-nums">{Math.ceil((boss.hp / boss.maxHp) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-red-900">
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 transition-all duration-150"
                  style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Score, High Score, Pause & Audio */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/30 shadow-lg">
            <div className="text-[10px] text-slate-400 font-mono tracking-wider">SCORE</div>
            <div className="font-mono font-bold text-base sm:text-lg text-cyan-300 tabular-nums drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
              {score.toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-400 font-mono tabular-nums">
              HIGH: {highScore.toLocaleString()}
            </div>
          </div>

          <div className="flex flex-col gap-1 pointer-events-auto">
            <button
              onClick={onPause}
              aria-label="Pause Game"
              className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded-lg border border-slate-700 transition-colors"
            >
              <Pause className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleMute}
              aria-label="Toggle Audio"
              className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded-lg border border-slate-700 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Middle Floating: Active Powerups & Dynamic Combo */}
      <div className="flex justify-between items-center w-full px-2">
        {/* Active Powerups */}
        <div className="flex flex-col gap-1.5">
          {activePowerUps.map(p => (
            <div
              key={p.label}
              className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded border shadow-sm text-xs font-mono"
              style={{ borderColor: `${p.color}66` }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-[10px] font-bold text-slate-200">{p.label}</span>
              <div className="w-12 bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${p.ratio * 100}%`, backgroundColor: p.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Combo Multiplier */}
        {combo > 1 && (
          <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.4)] flex flex-col items-center animate-bounce">
            <div className="text-xs font-bold font-mono text-amber-400 tracking-wider">
              {combo >= 8 ? 'MAX STRIKE' : `COMBO x${combo}`}
            </div>
            <div className="w-16 bg-slate-950 h-1 rounded-full overflow-hidden mt-1">
              <div
                className="bg-amber-400 h-full transition-all duration-100"
                style={{ width: `${(comboTimer / 120) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Telemetry: EMP Bomb Ability Trigger */}
      <div className="flex justify-center items-center w-full pb-2">
        <button
          onClick={onTriggerEMP}
          disabled={empRatio < 1}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border transition-all duration-200 ${
            empRatio >= 1
              ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white border-amber-300 shadow-[0_0_20px_rgba(249,115,22,0.8)] cursor-pointer scale-105 active:scale-95'
              : 'bg-slate-900/70 text-slate-500 border-slate-800 cursor-not-allowed'
          }`}
        >
          <Bomb className={`w-4 h-4 ${empRatio >= 1 ? 'animate-spin' : ''}`} />
          <span className="font-mono font-bold text-xs sm:text-sm tracking-wider">
            {empRatio >= 1 ? 'EMP BLAST READY [SHIFT]' : `EMP CHARGING ${Math.floor(empRatio * 100)}%`}
          </span>
        </button>
      </div>
    </div>
  );
};
