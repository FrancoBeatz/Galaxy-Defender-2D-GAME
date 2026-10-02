import React from 'react';
import { Shield, Zap, Heart, Play, Gauge, Radio, Crosshair } from 'lucide-react';
import { Upgrades } from '../../types/game';

interface HangarShopModalProps {
  wave: number;
  credits: number;
  upgrades: Upgrades;
  onUpgrade: (key: keyof Upgrades) => void;
  onContinue: () => void;
}

export const HangarShopModal: React.FC<HangarShopModalProps> = ({
  wave,
  credits,
  upgrades,
  onUpgrade,
  onContinue
}) => {
  const getUpgradeCost = (key: keyof Upgrades): number => {
    switch (key) {
      case 'maxHealth':
        return Math.floor((upgrades.maxHealth / 20) * 60);
      case 'maxShield':
        return Math.floor((upgrades.maxShield / 20) * 70);
      case 'damage':
        return Math.floor(upgrades.damage * 90);
      case 'fireRate':
        return Math.floor(upgrades.fireRate * 80);
      case 'speed':
        return Math.floor(upgrades.speed * 60);
      case 'magnetRange':
        return Math.floor(upgrades.magnetRange * 50);
      default:
        return 100;
    }
  };

  const upgradeItems: {
    key: keyof Upgrades;
    title: string;
    desc: string;
    level: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }[] = [
    {
      key: 'damage',
      title: 'PLASMA OVERCHARGE',
      desc: 'Increases weapon damage per projectile strike.',
      level: upgrades.damage,
      icon: Crosshair,
      color: 'text-rose-400 border-rose-500/40'
    },
    {
      key: 'fireRate',
      title: 'RAPID CYCLER',
      desc: 'Accelerates projectile firing rate and reduces weapon cooldown.',
      level: upgrades.fireRate,
      icon: Zap,
      color: 'text-amber-400 border-amber-500/40'
    },
    {
      key: 'maxShield',
      title: 'AEGIS SHIELD MATRIX',
      desc: 'Increases maximum force field absorption capacity.',
      level: Math.floor(upgrades.maxShield / 20),
      icon: Shield,
      color: 'text-cyan-400 border-cyan-500/40'
    },
    {
      key: 'maxHealth',
      title: 'TITANIUM PLATING',
      desc: 'Reinforces hull durability and increases maximum HP.',
      level: Math.floor(upgrades.maxHealth / 20),
      icon: Heart,
      color: 'text-emerald-400 border-emerald-500/40'
    },
    {
      key: 'speed',
      title: 'ION THRUSTERS',
      desc: 'Enhances strafing acceleration and evasion speed.',
      level: upgrades.speed,
      icon: Gauge,
      color: 'text-blue-400 border-blue-500/40'
    },
    {
      key: 'magnetRange',
      title: 'GRAVITON COLLECTOR',
      desc: 'Attracts power-ups and mineral credits from greater distance.',
      level: upgrades.magnetRange,
      icon: Radio,
      color: 'text-purple-400 border-purple-500/40'
    }
  ];

  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-4 z-40 overflow-y-auto">
      <div className="bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-5 sm:p-8 max-w-2xl w-full shadow-[0_0_40px_rgba(6,182,212,0.3)] flex flex-col my-auto">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">TACTICAL COMMAND</div>
            <h2 className="text-xl sm:text-2xl font-mono font-bold text-white">WAVE {wave - 1} SECURED</h2>
          </div>
          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-amber-500/30 flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">CREDITS:</span>
            <span className="text-base font-mono font-bold text-amber-400 tabular-nums">{credits}</span>
          </div>
        </div>

        {/* Upgrade Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {upgradeItems.map(item => {
            const cost = getUpgradeCost(item.key);
            const canAfford = credits >= cost;
            const IconComponent = item.icon;

            return (
              <div
                key={item.key}
                className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-slate-900 border ${item.color}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-xs font-mono font-bold text-slate-200 truncate">{item.title}</h3>
                      <span className="text-[10px] font-mono text-cyan-400 shrink-0 ml-1">LVL {item.level}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{item.desc}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-900 flex justify-end">
                  <button
                    onClick={() => onUpgrade(item.key)}
                    disabled={!canAfford}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      canAfford
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.5)] active:scale-95'
                        : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    UPGRADE ({cost}C)
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Continue Button */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onContinue}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 text-slate-950 font-mono font-bold text-sm tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            DEPLOY TO WAVE {wave}
          </button>
        </div>
      </div>
    </div>
  );
};
