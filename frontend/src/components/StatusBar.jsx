import React from 'react'

const SERVICE_COLORS = {
    idle: 'var(--text-dim)',
    requesting: 'var(--primary)',
    received: 'var(--success)',
    streaming: 'var(--primary)',
    error: 'var(--danger)',
}

const SERVICE_LABELS = {
    groq: 'GROQ',
    google: 'GEMINI',
    tts: 'TTS',
    memory: 'MEM',
    stt: 'STT',
}

function StatusDot({ service, state }) {
    const color = SERVICE_COLORS[state] || SERVICE_COLORS.idle
    const label = SERVICE_LABELS[service] || service.toUpperCase()
    return (
        <div className="status-bar__dot" title={`${label}: ${state}`}>
            <span className="status-bar__indicator" style={{ background: color }} />
            <span className="status-bar__label">{label}</span>
        </div>
    )
}

export default function StatusBar({ services, activity, connected }) {
    return (
        <div className="status-bar">
            <div className="status-bar__services">
                <span className="status-bar__indicator" style={{
                    background: connected ? 'var(--success)' : 'var(--danger)'
                }} />
                {Object.entries(services).map(([service, state]) => (
                    <StatusDot key={service} service={service} state={state} />
                ))}
            </div>
            {activity && (
                <div className="status-bar__activity">
                    {activity}
                </div>
            )}
        </div>
    )
}
