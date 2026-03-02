import React from 'react'

export default function HudBackground() {
    const particles = Array.from({ length: 6 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 10}s`,
        duration: `${8 + Math.random() * 10}s`,
    }))

    return (
        <div className="hud-bg">
            <div className="hud-bg__grid" />
            <div className="hud-bg__vignette" />
            {particles.map(p => (
                <div
                    key={p.id}
                    className="hud-bg__particle"
                    style={{
                        left: p.left,
                        bottom: '-10px',
                        animationDelay: p.delay,
                        animationDuration: p.duration,
                    }}
                />
            ))}
        </div>
    )
}
