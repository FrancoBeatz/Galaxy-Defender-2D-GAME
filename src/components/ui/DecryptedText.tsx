import React, { useEffect, useState } from 'react';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  className?: string;
  encryptedClassName?: string;
  animateOnMount?: boolean;
}

const GLYPHS = '01アイウエオカキクケコサシスセソタチツテト#@*&%$<>[]{}';

export const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  speed = 30,
  maxIterations = 10,
  className = '',
  encryptedClassName = 'text-cyan-400 opacity-75',
  animateOnMount = true
}) => {
  const [displayText, setDisplayText] = useState(animateOnMount ? '' : text);
  const [isDecrypted, setIsDecrypted] = useState(!animateOnMount);

  useEffect(() => {
    let iteration = 0;
    setIsDecrypted(false);

    const interval = setInterval(() => {
      setDisplayText(() => {
        return text
          .split('')
          .map((char, index) => {
            if (char === ' ' || char === '\n') return char;
            if (index < iteration) {
              return text[index];
            }
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join('');
      });

      iteration += 1 / (maxIterations / text.length);

      if (iteration >= text.length) {
        clearInterval(interval);
        setDisplayText(text);
        setIsDecrypted(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, maxIterations]);

  return (
    <span className={`${className} ${!isDecrypted ? encryptedClassName : ''} font-mono tracking-wider`}>
      {displayText}
    </span>
  );
};
