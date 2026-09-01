'use client';

import React from 'react';

export type AppIconProps = {
  size?: number | string;
  radius?: number | string;
  withGlow?: boolean;
  glowColor?: string;
  className?: string;
  style?: React.CSSProperties;
};

export function AppIcon({
  size = 36,
  radius = 10,
  withGlow = true,
  glowColor = 'rgba(99, 102, 241, 0.4)',
  className,
  style,
}: AppIconProps) {
  const widthValue = typeof size === 'number' ? `${size}px` : size;
  const heightValue = typeof size === 'number' ? `${size}px` : size;
  const radiusValue = typeof radius === 'number' ? `${radius}px` : radius;

  return (
    <div
      className={className}
      style={{
        width: widthValue,
        height: heightValue,
        borderRadius: radiusValue,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: withGlow ? `0 4px 16px ${glowColor}` : undefined,
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
        ...style,
      }}
    >
      <svg
        viewBox="0 0 512 512"
        width="100%"
        height="100%"
        style={{
          borderRadius: radiusValue,
          overflow: 'hidden',
          display: 'block',
        }}
        role="img"
        aria-label="Word Memorizer Icon"
      >
        <defs>
          {/* Background Gradient */}
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>

          {/* Accent Gradient */}
          <linearGradient id="logoAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>

          {/* Glow Filter */}
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Shadow */}
          <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow
              dx="0"
              dy="10"
              stdDeviation="14"
              floodColor="#1e1b4b"
              floodOpacity="0.45"
            />
          </filter>
        </defs>

        {/* Base Rounded Squircle */}
        <rect width="512" height="512" rx="128" fill="url(#logoBgGrad)" />

        {/* Inner Border Highlight */}
        <rect
          x="8"
          y="8"
          width="496"
          height="496"
          rx="120"
          fill="none"
          stroke="rgba(255, 255, 255, 0.28)"
          strokeWidth="4"
        />

        {/* Ambient Reflection Arch */}
        <path
          d="M40 128 C40 60, 60 40, 128 40 L384 40 C452 40, 472 60, 472 128 C472 160, 380 200, 256 200 C132 200, 40 160, 40 128 Z"
          fill="rgba(255, 255, 255, 0.12)"
        />

        {/* Main Symbol Group with Shadow */}
        <g filter="url(#logoShadow)">
          {/* Open Book / Card Left Page */}
          <path
            d="M256 376 C220 348, 140 336, 92 344 C82 346, 74 338, 74 328 L74 172 C74 162, 84 154, 94 152 C146 142, 224 156, 256 186 Z"
            fill="#ffffff"
            opacity="0.96"
          />

          {/* Open Book / Card Right Page */}
          <path
            d="M256 376 C292 348, 372 336, 420 344 C430 346, 438 338, 438 328 L438 172 C438 162, 428 154, 418 152 C366 142, 288 156, 256 186 Z"
            fill="#ffffff"
            opacity="0.96"
          />

          {/* Spine Center Ridge */}
          <path d="M256 186 L256 382" stroke="#4f46e5" strokeWidth="8" strokeLinecap="round" />

          {/* Left Page Knowledge Lines */}
          <path
            d="M124 204 C158 198, 204 204, 226 218"
            stroke="#6366f1"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M124 246 C158 240, 204 246, 226 260"
            stroke="#818cf8"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M124 288 C158 282, 204 288, 226 302"
            stroke="#818cf8"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Right Page Knowledge Lines */}
          <path
            d="M388 204 C354 198, 308 204, 286 218"
            stroke="#6366f1"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M388 246 C354 240, 308 246, 286 260"
            stroke="#818cf8"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M388 288 C354 282, 308 288, 286 302"
            stroke="#818cf8"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Neural Memory Constellation / Rising Spark */}
          <path
            d="M256 160 L216 112 M256 160 L296 112 M256 130 L256 72"
            stroke="url(#logoAccentGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            filter="url(#logoGlow)"
          />

          {/* Neural Nodes */}
          <circle cx="256" cy="68" r="22" fill="#38bdf8" filter="url(#logoGlow)" />
          <circle cx="256" cy="68" r="12" fill="#ffffff" />

          <circle cx="206" cy="106" r="16" fill="#818cf8" />
          <circle cx="206" cy="106" r="8" fill="#ffffff" />

          <circle cx="306" cy="106" r="16" fill="#c084fc" />
          <circle cx="306" cy="106" r="8" fill="#ffffff" />

          {/* Mini Star Sparks */}
          <path
            d="M356 76 L360 88 L372 92 L360 96 L356 108 L352 96 L340 92 L352 88 Z"
            fill="#38bdf8"
          />
          <path
            d="M156 86 L159 95 L168 98 L159 101 L156 110 L153 101 L144 98 L153 95 Z"
            fill="#f43f5e"
          />
        </g>
      </svg>
    </div>
  );
}
