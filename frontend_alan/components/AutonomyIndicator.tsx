'use client';

import React from 'react';

export const AutonomyIndicator = ({ level }: { level: number }) => {
    return (
        <div className="flex flex-col items-end gap-1">
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                        key={i}
                        className={`w-1 h-3 rounded-sm transition-all duration-300 ${i <= level ? 'bg-cyan-400 shadow-[0_0_5px_cyan]' : 'bg-white/10'
                            }`}
                    />
                ))}
            </div>
            <span className="text-[9px] font-mono tracking-widest text-white/50">
                AUTONOMY LVL {level}
            </span>
        </div>
    );
};
