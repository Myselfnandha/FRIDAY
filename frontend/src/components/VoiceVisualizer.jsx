import React from 'react'

export default function VoiceVisualizer({ isActive = false }) {
    const barCount = 7
    const bars = Array.from({ length: barCount }, (_, i) => ({
        id: i,
        delay: `${i * 0.08}s`,
        height: `${30 + Math.random() * 70}%`,
    }))

    return (
        <div className={`visualizer ${!isActive ? 'visualizer--idle' : ''}`}>
            {bars.map(bar => (
                <div
                    key={bar.id}
                    className="visualizer__bar"
                    style={{
                        animationDelay: bar.delay,
                        height: bar.height,
                    }}
                />
            ))}
        </div>
    )
}
