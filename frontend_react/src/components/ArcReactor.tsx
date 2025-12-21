import React from 'react';

interface ArcReactorProps {
    state: "idle" | "listening" | "thinking" | "speaking";
    volume?: number; // 0 to 1
}

export const ArcReactor: React.FC<ArcReactorProps> = ({ state, volume = 0 }) => {
    // Map state to colors/speeds
    const isSpeaking = state === 'speaking';
    const isThinking = state === 'thinking';
    const isListening = state === 'listening';

    const coreColor = isThinking ? '#ff00ff' : (isSpeaking ? '#00d9ff' : '#0088aa');
    const scale = 1 + (isSpeaking ? volume * 0.5 : 0);

    return (
        <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Outer Ring */}
            <div
                className="absolute w-full h-full rounded-full border-2 border-primary shadow-[0_0_20px_var(--primary)] animate-[spin_4s_linear_infinite]"
                style={{ borderLeftColor: 'transparent', borderRightColor: 'transparent' }}
            ></div>

            {/* Inner Ring */}
            <div
                className="absolute w-[70%] h-[70%] rounded-full border-2 border-primary shadow-[0_0_15px_var(--primary)] animate-[spin_3s_linear_infinite_reverse]"
                style={{ borderTopColor: 'transparent', borderBottomColor: 'transparent' }}
            ></div>

            {/* Core Glow */}
            <div
                className="absolute w-[40%] h-[40%] bg-primary rounded-full opacity-20 blur-xl"
                style={{ backgroundColor: coreColor }}
            ></div>

            {/* Core Solid */}
            <div
                className="absolute w-[30%] h-[30%] bg-primary rounded-full shadow-[0_0_30px_var(--primary)] transition-all duration-100 ease-out"
                style={{
                    transform: `scale(${scale})`,
                    backgroundColor: coreColor,
                    boxShadow: `0 0 ${20 + volume * 50}px ${coreColor}`
                }}
            ></div>
        </div>
    );
};
