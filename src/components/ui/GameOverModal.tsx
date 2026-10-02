import React from 'react';
import { RotateCcw, Home, Award, Target, Zap, Clock } from 'lucide-react';
import { PlayerStats } from '../../types/game';

interface GameOverModalProps {
  stats: PlayerStats;
  highScore: number;
  isNewHigh: boolean;
  onRestart: () => void;
  onReturnToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  highScore,
  isNewHigh,
  onRestart,
  onReturnToMenu
}) => {
  const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
  const minutes = Math.floor(stats.timeSurvivedSeconds / 60);
  const seconds = Math.floor(stats.timeSurvivedSeconds % 60);

  return (
    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-4 z-40">
      <div className="bg-slate-900/95 border border-rose-500/50 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_40px_rgba(244,63,94,0.3)] text-center flex flex-col items-center">
        <h2 className="text-3xl sm:text-4xl font-mono font-extrabold text-rose-500 tracking-widest drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]">
          MISSION FAILED
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-6 font-mono">HULL INTEGRITY COMPROMISED</p>

        {isNewHigh && (
          <div className="mb-4 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-mono font-bold text-xs flex items-center gap-2 animate-bounce">
            <Award className="w-4 h-4" />
            NEW SECTOR RECORD ACHIEVED!
          </div>
        )}

        {/* Mission Debriefing Telemetry Stats */}
        <div className="grid grid-cols-2 gap-3 w-full bg-slate-950/80 p-4 rounded-xl border border-slate-800 font-mono text-xs mb-6">
          <div className="flex flex-col items-start p-2 bg-slate-900/60 rounded border border-slate-800">
            <span className="text-slate-500 flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-cyan-400" /> FINAL SCORE</span>
            <span className="text-lg font-bold text-cyan-300 tabular-nums mt-1">{stats.score.toLocaleString()}</span>
          </div>

          <div className="flex flex-col items-start p-2 bg-slate-900/60 rounded border border-slate-800">
            <span className="text-slate-500 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-rose-400" /> WAVE REACHED</span>
            <span className="text-lg font-bold text-rose-300 tabular-nums mt-1">WAVE {stats.wave}</span>
          </div>

          <div className="flex flex-col items-start p-2 bg-slate-900/60 rounded border border-slate-800">
            <span className="text-slate-500 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-400" /> ACCURACY</span>
            <span className="text-base font-bold text-amber-300 tabular-nums mt-1">{accuracy}%</span>
          </div>

          <div className="flex flex-col items-start p-2 bg-slate-900/60 rounded border border-slate-800">
            <span className="text-slate-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-400" /> TIME SURVIVED</span>
            <span className="text-base font-bold text-emerald-300 tabular-nums mt-1">{minutes}m {seconds}s</span>
          </div>

          <div className="flex flex-col items-start p-2 bg-slate-900/60 rounded border border-slate-800 col-span-2">
            <div className="flex justify-between w-full">
              <span className="text-slate-500">ENEMIES DESTROYED:</span>
              <span className="text-slate-200 font-bold tabular-nums">{stats.enemiesDefeated}</span>
            </div>
            <div className="flex justify-between w-full mt-1">
              <span className="text-slate-500">MAX COMBO STRIKE:</span>
              <span className="text-amber-400 font-bold tabular-nums">x{stats.maxCombo}</span>
            </div>
            <div className="flex justify-between w-full mt-1">
              <span className="text-slate-500">SECTOR HIGH SCORE:</span>
              <span className="text-cyan-400 font-bold tabular-nums">{highScore.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full font-mono text-sm">
          <button
            onClick={onRestart}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.4)] cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            RETRY MISSION
          </button>
          <button
            onClick={onReturnToMenu}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Home className="w-4 h-4" />
            MAIN HANGAR
          </button>
        </div>
      </div>
    </div>
  );
};
