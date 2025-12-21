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

function MainInterface() {
    const room = useRoomContext();
    const { state, audioTrack } = useVoiceAssistant(); // requires agent to be publishing audio?
    // Actually useVoiceAssistant hook might rely on specific track source.
    // Let's rely on VAD events or audio level for reactor if useVoiceAssistant is tricky without standardized setup.
    // But typically LK Agents use standard tracks.

    // Calculate Volume for reactor
    const vol = useTrackVolume(audioTrack); // works if audioTrack is defined

    // Determine detailed state
    // state returns 'listening', 'thinking', 'speaking' (if supported backend)
    // Detailed fallback:
    const [agentState, setAgentState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");

    useEffect(() => {
        if (state) {
            setAgentState(state as any);
        }
    }, [state]);

    // Manual Agent Loop workaround if hook doesn't pick up custom agent events:
    useEffect(() => {
        if (!room) return;
        const onSpeakersChanged = (speakers: any[]) => {
            const isAgentSpeaking = speakers.some(s => !s.isLocal);
            if (isAgentSpeaking) setAgentState('speaking');
            else if (agentState === 'speaking') setAgentState('idle'); // simple fallback
        }
        room.on(RoomEvent.ActiveSpeakersChanged, onSpeakersChanged);
        return () => { room.off(RoomEvent.ActiveSpeakersChanged, onSpeakersChanged); }
    }, [room, agentState]);


    return (
        <div className="relative h-full w-full flex flex-col">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-black pointer-events-none"></div>

            {/* Header */}
            <header className="flex justify-between items-center p-6 z-10 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#0f0]"></div>
                    <h1 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                        {appConfig.title.toUpperCase()}
                    </h1>
                </div>
                <AutonomyIndicator level={2} />
            </header>

            {/* Main Stage */}
            <main className="flex-1 flex flex-col items-center justify-center relative z-10 gap-8">

                {/* Reactor */}
                <div className="relative">
                    <ArcReactor state={agentState} volume={vol || 0} />
                </div>

                {/* State Label */}
                <AgentState state={agentState} />

                {/* Status/Transcript Placeholder - could be expanded */}
                <div className="h-12"></div>
            </main>

            {/* Footer / Controls */}
            <footer className="p-6 flex justify-between items-end z-10">
                {/* Session Memory */}
                <SessionMemory />

                {/* Local Controls */}
                <LocalControls />
            </footer>
        </div>
    )
}

function LocalControls() {
    const { localParticipant } = useLocalParticipant();
    const [micOn, setMicOn] = useState(true);

    const toggleMic = () => {
        const newState = !micOn;
        setMicOn(newState);
        localParticipant.setMicrophoneEnabled(newState);
    }

    return (
        <div className="flex gap-4">
            <button onClick={toggleMic} className={`p - 4 rounded - full border border - white / 20 transition - all ${micOn ? 'bg-primary/20 text-primary shadow-[0_0_15px_var(--primary)]' : 'bg-red-500/20 text-red-500'} `}>
                {micOn ? <Mic /> : <MicOff />}
            </button>
            {/* Add more controls like Disconnect, Settings */}
        </div>
    )
}

export default App;
