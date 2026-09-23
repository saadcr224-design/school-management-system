import React from 'react';

export default function SchoolLogo({ size = 38, showText = false, textDark = true, className = '' }) {
  return (
    <div className={`school-brand-logo-wrap ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Outer Circular Shield with Royal Gradient */}
        <circle cx="50" cy="50" r="48" fill="url(#brandGrad1)" stroke="url(#goldGrad)" strokeWidth="3" />
        
        {/* Inner Ring with Subtle Golden Glow */}
        <circle cx="50" cy="50" r="41" fill="none" stroke="#fcd34d" strokeWidth="1" strokeDasharray="3 2" />
        <circle cx="50" cy="50" r="39" fill="#0b1b36" />

        {/* Academic Stars */}
        <path d="M50 16 L51.5 20 L55.5 20.5 L52.5 23 L53.5 27 L50 24.5 L46.5 27 L47.5 23 L44.5 20.5 L48.5 20 Z" fill="#f59e0b" />
        <circle cx="22" cy="50" r="2" fill="#fbbf24" />
        <circle cx="78" cy="50" r="2" fill="#fbbf24" />

        {/* Graduation Cap / Mortarboard */}
        <path d="M50 28 L72 38 L50 48 L28 38 Z" fill="url(#goldGrad)" stroke="#b45309" strokeWidth="1" />
        <path d="M38 43 L38 54 Q50 60 62 54 L62 43" fill="none" stroke="#fcd34d" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M68 40 L74 52" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <circle cx="74" cy="53" r="2" fill="#f59e0b" />

        {/* Open Book of Knowledge */}
        <path d="M50 56 Q40 50 26 53 L26 73 Q40 70 50 76 Q60 70 74 73 L74 53 Q60 50 50 56 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
        <path d="M50 56 L50 76" stroke="#0f1d38" strokeWidth="1.8" />
        <path d="M32 59 Q40 57 46 60 M32 64 Q40 62 46 65 M32 69 Q40 67 46 70" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />
        <path d="M68 59 Q60 57 54 60 M68 64 Q60 62 54 65 M68 69 Q60 67 54 70" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" />

        {/* Laurel Wreath / Golden Torch Base */}
        <path d="M22 75 Q32 88 50 88 Q68 88 78 75" fill="none" stroke="url(#goldGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M46 88 L54 88 L52 92 L48 92 Z" fill="#f59e0b" />

        {/* Gradients */}
        <defs>
          <linearGradient id="brandGrad1" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0f1d38" />
            <stop offset="0.6" stopColor="#1e3a8a" />
            <stop offset="1" stopColor="#0369a1" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbbf24" />
            <stop offset="0.5" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#d97706" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ 
            fontWeight: '900', 
            fontSize: `${Math.max(size * 0.32, 11)}px`, 
            color: textDark ? '#0f1d38' : '#ffffff',
            letterSpacing: '0.04em',
            lineHeight: 1.15
          }}>
            SHEZAD CHILDREN ACADEMY
          </span>
          <span style={{ 
            fontSize: `${Math.max(size * 0.22, 9)}px`, 
            color: textDark ? '#0369a1' : '#38bdf8',
            fontWeight: '700',
            letterSpacing: '0.02em',
            textTransform: 'uppercase'
          }}>
            Schools & Colleges
          </span>
        </div>
      )}
    </div>
  );
}
