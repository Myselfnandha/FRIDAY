import React from 'react'
import ArcReactor from '../components/ArcReactor'
import HudBackground from '../components/HudBackground'

export default function IntroScreen({ onStart }) {
    return (
        <div className="intro">
            <HudBackground />
            <ArcReactor size="default" />
            <p className="intro__subtitle">
                Chat live with F.R.I.D.A.Y, your voice AI agent.
            </p>
            <button className="intro__btn" onClick={onStart}>
                TALK TO F.R.I.D.A.Y
            </button>
        </div>
    )
}
