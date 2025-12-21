import { useEffect, useState } from 'react';
import {
    LiveKitRoom,
    RoomAudioRenderer,
    StartAudio,
    useLocalParticipant,
    useRoomContext,
    useVoiceAssistant,
    useTrackVolume,
} from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { Mic, MicOff } from 'lucide-react';
import { appConfig } from './app-config';
import { ArcReactor } from './components/ArcReactor';
import { AutonomyIndicator } from './components/AutonomyIndicator';
import { SessionMemory } from './components/SessionMemory';
import { AgentState } from './components/AgentState';

function App() {
    const [token, setToken] = useState("");
    const [url, setUrl] = useState("");

    useEffect(() => {
        // Auto-connect flow
        const connect = async () => {
            try {
                const storedUrl = localStorage.getItem('backend_url') || appConfig.defaultBackendUrl;
                const res = await fetch(`${storedUrl}/api/token`);
                const data = await res.json();
                setToken(data.token);
                setUrl(data.url);
            } catch (e) {
                console.error("Failed to fetch token", e);
            }
        };
        connect();
    }, []);

    if (!token) {
        return (
            <div className="h-screen w-screen bg-black flex items-center justify-center text-primary font-mono">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    <div className="text-xl tracking-widest">INITIALIZING SECURE CONNECTION...</div>
                </div>
            </div>
        )
    }

    return (
        <LiveKitRoom
            token={token}
            serverUrl={url}
            connect={true}
            video={false}
            audio={true}
            className="h-screen w-screen bg-black overflow-hidden font-mono text-white"
        >
            <MainInterface />
            <RoomAudioRenderer />
            {/* Helper to start audio context if needed */}
            <StartAudio label="INITIALIZE NEURAL LINK" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-primary text-black px-6 py-3 rounded font-bold tracking-widest hover:bg-white transition-colors" />
        </LiveKitRoom>
    );
}

import { Sidebar } from './components/Sidebar';
import { ControlGrid } from './components/ControlGrid';

function MainInterface() {
    const room = useRoomContext();
    const { state, audioTrack } = useVoiceAssistant();
    const vol = useTrackVolume(audioTrack);

    // Determine detailed state
    const [agentState, setAgentState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");

    useEffect(() => {
        if (state) {
            setAgentState(state as any);
        }
    }, [state]);

    // Manual Agent Loop workaround
    useEffect(() => {
        if (!room) return;
        const onSpeakersChanged = (speakers: any[]) => {
            const isAgentSpeaking = speakers.some(s => !s.isLocal);
            if (isAgentSpeaking) setAgentState('speaking');
            else if (agentState === 'speaking') setAgentState('idle');
        }
        room.on(RoomEvent.ActiveSpeakersChanged, onSpeakersChanged);
        return () => { room.off(RoomEvent.ActiveSpeakersChanged, onSpeakersChanged); }
    }, [room, agentState]);


    return (
        <div className="relative h-full w-full flex overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-black pointer-events-none"></div>

            {/* Left Sidebar */}
            <div className="relative z-20 h-full flex flex-col">
                <Sidebar />
                <div className="p-4 border-t border-white/10 bg-black/60 backdrop-blur w-80">
                    <SessionMemory />
                </div>
            </div>

            {/* Main Stage */}
            <div className="flex-1 flex flex-col relative z-10">
                {/* Header */}
                <header className="flex justify-between items-center p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#0f0]"></div>
                        <h1 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                            {appConfig.title.toUpperCase()}
                        </h1>
                    </div>
                    <div className="flex gap-4 items-center">
                        <AgentState state={agentState} />
                        <AutonomyIndicator level={2} />
                    </div>
                </header>

                {/* Center Visualizer */}
                <main className="flex-1 flex flex-col items-center justify-center gap-8 relative">
                    <div className="relative transform hover:scale-105 transition-transform duration-500">
                        <ArcReactor state={agentState} volume={vol || 0} />
                    </div>

                    {/* Captions / Transcript Overlay could go here */}
                    {agentState === 'speaking' && (
                        <div className="absolute bottom-12 text-center w-2/3 text-lg font-mono text-cyan-300 drop-shadow-[0_0_5px_rgba(0,255,255,0.5)] bg-black/40 p-2 rounded backdrop-blur-sm">
                            {/* Placeholder for real-time captions if available via stt.SpeechEvent */}
                            [VOICE OUTPUT ACTIVE]
                        </div>
                    )}
                </main>

                {/* Footer Controls */}
                <footer className="flex justify-center pb-0 z-20">
                    <ControlGrid />
                </footer>
            </div>
        </div>
    )
}

export default App;
