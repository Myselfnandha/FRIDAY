'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ArcReactorProps {
    state: 'idle' | 'listening' | 'thinking' | 'speaking';
    volume: number;
}

export const ArcReactor = ({ state, volume }: ArcReactorProps) => {
    // Normalize volume for animation (0 to 1)
    const normalizedVol = Math.min(Math.max(volume, 0), 1);
    const pulseScale = 1 + normalizedVol * 0.5;

    // Realistic Colors
    const coreColor = state === 'listening' ? 'cyan' :
        state === 'thinking' ? 'purple' :
            state === 'speaking' ? 'blue' : 'cyan';

    // CSS Variables for dynamic coloring
    const glowColor = state === 'thinking' ? 'rgba(168, 85, 247, 0.8)' :
        state === 'speaking' ? 'rgba(59, 130, 246, 0.8)' :
            'rgba(6, 182, 212, 0.8)'; // Cyan default

    return (
        <div className="relative w-64 h-64 flex items-center justify-center">

            {/* --- REACTOR CHASSIS (Detailed Metallic Ring) --- */}
            {/* Outer Dark Ring */}
            <div className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-gray-800 to-black border border-gray-700 shadow-[0_0_20px_rgba(0,0,0,0.8),inset_0_0_10px_black] flex items-center justify-center">

                {/* Inner Metallic Ring with Screws */}
                <div className="absolute w-56 h-56 rounded-full bg-gradient-to-tr from-gray-300 via-gray-100 to-gray-400 shadow-[inset_0_2px_5px_rgba(0,0,0,0.5),0_0_5px_white] flex items-center justify-center">
                    {/* Ring Grooves */}
                    <div className="absolute w-52 h-52 rounded-full border-[6px] border-gray-800/80 border-dashed animate-[spin_60s_linear_infinite]" />

                    {/* Glowing Channels */}
                    <div className="absolute w-48 h-48 rounded-full bg-black flex items-center justify-center overflow-hidden">
                        {/* Rotating Light Segments */}
                        <div className={`absolute w-full h-full rounded-full border-[8px] border-transparent border-t-${coreColor}-400/50 border-r-${coreColor}-400/50 blur-sm animate-[spin_2s_linear_infinite]`} />
                        <div className={`absolute w-40 h-40 rounded-full border-[4px] border-${coreColor}-500/30 animate-[spin_4s_linear_infinite_reverse]`} />
                    </div>
                </div>
            </div>

            {/* --- THE CORE (Plasma Energy) --- */}
            <motion.div
                className="relative z-10 w-24 h-24 rounded-full bg-white flex items-center justify-center"
                style={{
                    boxShadow: `0 0 30px 10px ${glowColor}, inset 0 0 20px ${glowColor}`
                }}
                animate={{
                    scale: pulseScale,
                    opacity: [0.9, 1, 0.9]
                }}
                transition={{
                    scale: { type: 'spring', stiffness: 400, damping: 20 },
                    opacity: { duration: 2, repeat: Infinity }
                }}
            >
                {/* Inner Detail (Triangle/Shape) */}
                <svg viewBox="0 0 100 100" className="w-16 h-16 opacity-80">
                    <path d="M50 15 L85 85 L15 85 Z" fill="none" stroke={glowColor} strokeWidth="4" className="drop-shadow-lg" />
                    <circle cx="50" cy="50" r="10" fill="white" className="animate-pulse" />
                </svg>
            </motion.div>

            {/* --- HOLOGRAPHIC OVERLAY (JARVIS HUD) --- */}
            <div className="absolute w-80 h-80 rounded-full border border-cyan-500/10 animate-[spin_10s_linear_infinite] pointer-events-none" />
            <div className="absolute w-72 h-72 rounded-full border border-cyan-500/20 border-t-transparent rotation-reverse animate-[spin_5s_linear_infinite_reverse] pointer-events-none" />

            {/* Status Text */}
            <div className="absolute -bottom-20 font-mono text-xs tracking-[0.3em] text-cyan-500 opacity-80">
                ARC REACTOR: {state.toUpperCase()}
            </div>
        </div>
    );
};
