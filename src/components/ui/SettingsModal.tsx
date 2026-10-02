import React from 'react';
import { X, Volume2, Sparkles, Monitor, Sliders } from 'lucide-react';
import { GameSettings } from '../../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose
}) => {
  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_30px_rgba(6,182,212,0.3)] my-auto flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-mono font-bold text-white">SETTINGS</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 text-xs font-mono">
          {/* Audio Controls */}
          <div>
            <div className="text-[11px] text-cyan-400 font-bold tracking-wider mb-2 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" /> AUDIO CONFIGURATION
            </div>
            <div className="space-y-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>MASTER VOLUME</span>
                  <span className="text-cyan-300 tabular-nums">{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={e => onUpdateSettings({ masterVolume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>SFX VOLUME</span>
                  <span className="text-cyan-300 tabular-nums">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={e => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>SYNTH BGM VOLUME</span>
                  <span className="text-cyan-300 tabular-nums">{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={e => onUpdateSettings({ musicVolume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Visual Effects & Accessibility */}
          <div>
            <div className="text-[11px] text-cyan-400 font-bold tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> VISUALS & ACCESSIBILITY
            </div>
            <div className="space-y-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">SCREEN SHAKE EFFECTS</span>
                <input
                  type="checkbox"
                  checked={settings.screenShake}
                  onChange={e => onUpdateSettings({ screenShake: e.target.checked })}
                  className="accent-cyan-400 w-4 h-4 rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-300">REDUCED MOTION MODE</span>
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={e => onUpdateSettings({ reducedMotion: e.target.checked })}
                  className="accent-cyan-400 w-4 h-4 rounded"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Close button */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs transition-colors cursor-pointer"
          >
            CONFIRM & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
