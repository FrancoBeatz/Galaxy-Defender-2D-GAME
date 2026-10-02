import React from 'react';

interface TrueFocusProps {
  sentence: string;
  className?: string;
  focusWord?: string;
}

export const TrueFocus: React.FC<TrueFocusProps> = ({
  sentence,
  className = '',
  focusWord
}) => {
  const words = sentence.split(' ');

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {words.map((word, idx) => {
        const isMatch = focusWord ? word.toLowerCase().includes(focusWord.toLowerCase()) : idx === 1;
        return (
          <span
            key={idx}
            className={`transition-all duration-300 font-bold ${
              isMatch
                ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)] scale-105'
                : 'text-slate-300 opacity-90'
            }`}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
