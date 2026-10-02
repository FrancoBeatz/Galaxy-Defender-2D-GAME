import React from 'react';
import { Play, RotateCcw, Home, Settings as SettingsIcon } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onOpenSettings: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onQuit,
  onOpenSettings
}) => {
  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-40">
      <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-[0_0_30px_rgba(6,182,212,0.4)] text-center flex flex-col items-center">
        <h2 className="text-2xl sm:text-3xl font-mono font-bold text-cyan-400 tracking-wider">
          TACTICAL PAUSE
        </h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">DEFENSE GRID SUSPENDED</p>

        <div className="flex flex-col gap-3 w-full font-mono text-sm">
          <button
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            RESUME COMBAT
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            RESTART SECTOR
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4" />
            SETTINGS
          </button>

          <button
            onClick={onQuit}
            className="w-full py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <Home className="w-4 h-4" />
            ABORT TO HANGAR
          </button>
        </div>
      </div>
    </div>
  );
};
