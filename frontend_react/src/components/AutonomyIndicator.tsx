import React from 'react';
import { Lock, Unlock } from 'lucide-react';

interface AutonomyProps {
    level: number; // 1-6
}

const LEVEL_LABELS = [
    "Manual", "Assistive", "Partial Ops", "Conditional Auto", "High Auto", "Full Autonomy"
];

export const AutonomyIndicator: React.FC<AutonomyProps> = ({ level }) => {
    // Clamp level
    const currentLevel = Math.max(1, Math.min(6, level));
    const label = LEVEL_LABELS[currentLevel - 1];

    return (
        <div className="flex flex-col gap-1 items-start bg-black/40 p-2 rounded border border-white/10 w-48 backdrop-blur-md">
            <div className="flex justify-between w-full text-xs text-secondary font-bold tracking-widest">
                <span>AUTONOMY: L{currentLevel}</span>
                {currentLevel > 4 ? <Unlock size={12} /> : <Lock size={12} />}
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden flex gap-[2px]">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div
                        key={i}
                        className={`flex-1 h-full transition-all duration-300 ${i <= currentLevel ? 'bg-secondary shadow-[0_0_10px_var(--secondary)]' : 'bg-gray-700'}`}
                    ></div>
                ))}
            </div>
            <div className="text-[10px] text-gray-400 uppercase">{label}</div>
        </div>
    );
};
