import React from 'react';

interface StateProps {
    state: "idle" | "listening" | "thinking" | "speaking";
}

export const AgentState: React.FC<StateProps> = ({ state }) => {

    const color = state === 'listening' ? 'text-green-400' :
        state === 'thinking' ? 'text-pink-500' :
            state === 'speaking' ? 'text-cyan-400' : 'text-gray-500';

    return (
        <div className={`px-4 py-1 rounded-full border border-white/10 bg-black/50 backdrop-blur-sm uppercase tracking-[0.2em] text-xs font-bold ${color} transition-colors duration-300`}>
            {state}
        </div>
    );
};
