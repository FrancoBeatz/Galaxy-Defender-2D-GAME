import React, { useRef } from 'react';
import { Crosshair, Bomb, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

interface TouchControlsProps {
  onMoveStart: (direction: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => void;
  onMoveEnd: (direction: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => void;
  onFireStart: () => void;
  onFireEnd: () => void;
  onTriggerEMP: () => void;
  empReady: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMoveStart,
  onMoveEnd,
  onFireStart,
  onFireEnd,
  onTriggerEMP,
  empReady
}) => {
  return (
    <div className="absolute inset-x-0 bottom-3 px-4 flex justify-between items-end pointer-events-none z-30 select-none touch-none">
      {/* Directional Pad */}
      <div className="pointer-events-auto grid grid-cols-3 gap-1.5 w-36 h-36 p-1 bg-slate-950/70 backdrop-blur-md rounded-2xl border border-cyan-500/30">
        <div />
        <button
          onTouchStart={() => onMoveStart('UP')}
          onTouchEnd={() => onMoveEnd('UP')}
          className="flex items-center justify-center bg-slate-900/80 active:bg-cyan-500/40 text-cyan-400 rounded-lg border border-slate-700 active:scale-95 transition-all"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        <div />

        <button
          onTouchStart={() => onMoveStart('LEFT')}
          onTouchEnd={() => onMoveEnd('LEFT')}
          className="flex items-center justify-center bg-slate-900/80 active:bg-cyan-500/40 text-cyan-400 rounded-lg border border-slate-700 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-center text-[10px] font-mono text-slate-500 font-bold">
          NAV
        </div>
        <button
          onTouchStart={() => onMoveStart('RIGHT')}
          onTouchEnd={() => onMoveEnd('RIGHT')}
          className="flex items-center justify-center bg-slate-900/80 active:bg-cyan-500/40 text-cyan-400 rounded-lg border border-slate-700 active:scale-95 transition-all"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <div />
        <button
          onTouchStart={() => onMoveStart('DOWN')}
          onTouchEnd={() => onMoveEnd('DOWN')}
          className="flex items-center justify-center bg-slate-900/80 active:bg-cyan-500/40 text-cyan-400 rounded-lg border border-slate-700 active:scale-95 transition-all"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
        <div />
      </div>

      {/* Action Buttons (EMP & Fire) */}
      <div className="pointer-events-auto flex items-end gap-3">
        {/* EMP Button */}
        <button
          onTouchStart={onTriggerEMP}
          disabled={!empReady}
          className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border transition-all ${
            empReady
              ? 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.8)] active:scale-90'
              : 'bg-slate-950/60 text-slate-600 border-slate-800'
          }`}
        >
          <Bomb className="w-5 h-5" />
          <span className="text-[8px] font-mono font-bold mt-0.5">EMP</span>
        </button>

        {/* Primary Laser Trigger */}
        <button
          onTouchStart={onFireStart}
          onTouchEnd={onFireEnd}
          className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-cyan-400 text-slate-950 border-2 border-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.8)] active:scale-90 active:bg-cyan-300 flex flex-col items-center justify-center transition-all"
        >
          <Crosshair className="w-8 h-8 stroke-[2.5]" />
          <span className="text-[10px] font-mono font-black tracking-widest mt-0.5">FIRE</span>
        </button>
      </div>
    </div>
  );
};
