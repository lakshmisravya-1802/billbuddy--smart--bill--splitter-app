import React from 'react';

export default function BillBuddyLogo({ 
  size = 48, 
  showText = true, 
  className = '' 
}) {
  return (
    <div className={`animated-logo-container flex-row align-center gap-2 ${className}`}>
      <div className="logo-svg-wrapper" style={{ width: size, height: size }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="billbuddy-svg-animated"
        >
          <defs>
            {/* Primary Card Gradient */}
            <linearGradient id="cardGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>

            {/* Secondary Accent Gradient */}
            <linearGradient id="cardGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>

            {/* Glowing Golden Coin Gradient */}
            <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FCD34D" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            {/* Shimmer Light Reflection Gradient */}
            <linearGradient id="shimmerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>

            {/* Filters for Glow and Depth */}
            <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#6366F1" floodOpacity="0.4" />
            </filter>
            <filter id="coinFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#F59E0B" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* 1. Pulsing Ambient Background Glow Circle */}
          <circle 
            cx="50" 
            cy="50" 
            r="44" 
            fill="url(#cardGrad1)" 
            fillOpacity="0.15" 
            className="anim-bg-pulse" 
          />

          {/* 2. Back Card (Floating Right with Offset Rotation) */}
          <rect
            x="36"
            y="20"
            width="44"
            height="56"
            rx="12"
            fill="url(#cardGrad2)"
            filter="url(#glowFilter)"
            className="anim-back-card"
          />

          {/* 3. Front Glass Card (Floating Left Counter-Sync) */}
          <rect
            x="20"
            y="24"
            width="44"
            height="56"
            rx="12"
            fill="url(#cardGrad1)"
            filter="url(#glowFilter)"
            className="anim-front-card"
          />

          {/* 4. Animated Bill Lines */}
          <g className="anim-bill-lines">
            <rect x="28" y="36" width="22" height="4" rx="2" fill="#FFFFFF" fillOpacity="0.95" className="line-1" />
            <rect x="28" y="44" width="16" height="4" rx="2" fill="#FFFFFF" fillOpacity="0.7" className="line-2" />
            <rect x="28" y="52" width="20" height="4" rx="2" fill="#FFFFFF" fillOpacity="0.7" className="line-3" />
          </g>

          {/* 5. Sweeping Light Reflection Overlay */}
          <rect
            x="20"
            y="24"
            width="44"
            height="56"
            rx="12"
            fill="url(#shimmerGrad)"
            className="anim-shimmer-sweep"
          />

          {/* 6. Floating Golden Split Coin */}
          <g className="anim-coin-badge">
            <circle cx="68" cy="66" r="14" fill="url(#coinGrad)" filter="url(#coinFilter)" />
            <path
              d="M68 58V74M63 62C63 60 65 59 68 59C71 59 73 60.5 73 63C73 66.5 63 65.5 63 69C63 71.5 65 73 68 73C71 73 73 72 73 70"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>

      {showText && (
        <span className="animated-brand-title">
          Bill<span className="gradient-shimmer-text">Buddy</span>
        </span>
      )}
    </div>
  );
}