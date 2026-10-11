import React, { useEffect, useState } from 'react';

export default function AnimatedNumber({ value, prefix = '', decimals = 2 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 600; // Animation duration in ms
    const startVal = displayValue;
    const endVal = parseFloat(value) || 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = startVal + (endVal - startVal) * progress;
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  return (
    <span className="animated-number-text">
      {prefix}{displayValue.toFixed(decimals)}
    </span>
  );
}