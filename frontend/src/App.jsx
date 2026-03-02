import React, { useState } from 'react'
import IntroScreen from './pages/IntroScreen'
import AssistantScreen from './pages/AssistantScreen'

export default function App() {
    const [started, setStarted] = useState(false)

    if (!started) {
        return <IntroScreen onStart={() => setStarted(true)} />
    }

    return <AssistantScreen onEnd={() => setStarted(false)} />
}
