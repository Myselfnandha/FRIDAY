import React from 'react'

export default function ArcReactor({ size = 'default' }) {
    const cls = `arc-reactor ${size === 'large' ? 'arc-reactor--large' : ''} ${size === 'bg' ? 'arc-reactor--bg' : ''}`

    const segments = Array.from({ length: 12 }, (_, i) => (
        <div
            key={i}
            className="arc-reactor__segment"
            style={{ transform: `rotate(${i * 30}deg)` }}
        />
    ))

    return (
        <div className={cls}>
            <div className="arc-reactor__ring arc-reactor__ring--3" />
            <div className="arc-reactor__ring arc-reactor__ring--2">
                {segments}
            </div>
            <div className="arc-reactor__ring arc-reactor__ring--1" />
            <div className="arc-reactor__core" />
        </div>
    )
}
