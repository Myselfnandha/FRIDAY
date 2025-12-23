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
    const pulseScale = 1 + normalizedVol * 0.5; // Scale up to 1.5x based on volume

    const getColor = () => {
        switch (state) {
            case 'listening': return 'text-cyan-400 drop-shadow-[0_0_15px_cyan]';
            case 'thinking': return 'text-purple-500 drop-shadow-[0_0_15px_purple]';
            case 'speaking': return 'text-blue-500 drop-shadow-[0_0_20px_blue]';
            case 'idle': default: return 'text-cyan-800/50';
        }
    };

    const ringColor = state === 'listening' ? 'border-cyan-400' :
        state === 'thinking' ? 'border-purple-500' :
            state === 'speaking' ? 'border-blue-500' : 'border-cyan-900/30';

    return (
        <div className={`relative w-64 h-64 flex items-center justify-center transition-all duration-500 ${getColor()}`}>

            {/* 1. Outer Tech Ring (JARVIS Style) - Rotating Slow */}
            <div className={`absolute w-full h-full border-2 ${ringColor} rounded-full border-dashed animate-[spin_10s_linear_infinite] opacity-40`}></div>

            {/* 2. Inner Tech Ring - Rotating Fast Reverse */}
            <div className={`absolute w-56 h-56 border-2 ${ringColor} rounded-full border-t-transparent border-l-transparent animate-[spin_3s_linear_infinite_reverse] opacity-60`}></div>

            {/* 3. TARS Square Frames (Rotating and shifting) */}
            <motion.div
                className={`absolute w-40 h-40 border border-white/20 bg-white/5 backdrop-blur-sm`}
                animate={{ rotate: state === 'working' ? 180 : 0 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
                className={`absolute w-32 h-32 border border-white/10`}
                animate={{ rotate: -45 }}
            />

            {/* 4. Core Pulse (Volume Reactive) */}
            <motion.div
                className="absolute w-20 h-20 bg-current rounded-full blur-xl opacity-50"
                animate={{ scale: pulseScale, opacity: 0.3 + normalizedVol }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            />

            {/* 5. Central Solid Core */}
            <div className="absolute w-12 h-12 bg-white rounded-sm shadow-[0_0_50px_currentColor] z-10 animate-pulse"></div>

            {/* 6. Text Overlay */}
            {state === 'speaking' && (
                <div className="absolute -bottom-16 text-xs font-mono tracking-[0.5em] text-cyan-200 animate-pulse">
                    A.L.A.N
                </div>
            )}
        </div>
    );
};
