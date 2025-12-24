'use client';

import { useEffect, useState, useRef } from 'react';
import {
    useRoomContext,
    useVoiceAssistant,
    useTrackVolume,
    useLocalParticipant,
    VideoTrack
} from '@livekit/components-react';
import { RoomEvent, Track, DataPacket_Kind } from 'livekit-client';
import { motion, AnimatePresence } from 'framer-motion';

import { ArcReactor } from './ArcReactor';
import { AutonomyIndicator } from './AutonomyIndicator';
import { ControlGrid } from './ControlGrid';
import { ChatInput } from './ChatInput';
import { IntroOverlay } from './IntroOverlay';

type Message = {
    role: 'user' | 'agent';
    text: string;
    timestamp: number;
};

export function ALANInterface() {
    const room = useRoomContext();
    const { state, audioTrack } = useVoiceAssistant();
    const volume = useTrackVolume(audioTrack);
    const { localParticipant } = useLocalParticipant();

    const [agentState, setAgentState] =
        useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');

    const [localVideoTrack, setLocalVideoTrack] = useState<Track | undefined>(undefined);
    const [messages, setMessages] = useState<Message[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [showIntro, setShowIntro] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // Auto-scroll chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle Data Messages (Chat)
    useEffect(() => {
        if (!room) return;

        const handleData = (payload: Uint8Array, participant?: any, kind?: DataPacket_Kind, topic?: string) => {
            const decoder = new TextDecoder();
            const str = decoder.decode(payload);
            try {
                const data = JSON.parse(str);
                if (data.type === 'agent_chat') {
                    setMessages(prev => [...prev, { role: 'agent', text: data.text, timestamp: Date.now() }]);
                    addLog("RECEIVED ENCRYPTED PAYLOAD");
                }
            } catch (e) {
                // ignore
            }
        };

        room.on(RoomEvent.DataReceived, handleData);
        room.on(RoomEvent.Reconnecting, () => addLog("LOST CARRIER - REROUTING..."));
        room.on(RoomEvent.Reconnected, () => addLog("UPLINK RESTORED"));

        addLog("SECURE CONNECTION ESTABLISHED");

        return () => { room.off(RoomEvent.DataReceived, handleData); };
    }, [room]);

    useEffect(() => {
        if (localParticipant) {
            const updateTrack = () => {
                const trackPub = localParticipant.getTrackPublication(Track.Source.Camera);
                setLocalVideoTrack(trackPub?.track);
                if (trackPub?.track) addLog("VISUAL SENSORS ACTIVE");
            }
            localParticipant.on(RoomEvent.LocalTrackPublished, updateTrack);
            localParticipant.on(RoomEvent.LocalTrackUnpublished, updateTrack);
            updateTrack();
            return () => {
                localParticipant.off(RoomEvent.LocalTrackPublished, updateTrack);
                localParticipant.off(RoomEvent.LocalTrackUnpublished, updateTrack);
            }
        }
    }, [localParticipant]);


    useEffect(() => {
        if (state) setAgentState(state as any);
    }, [state]);

    // Fallback speaker detection
    useEffect(() => {
        if (!room) return;
        const fn = (speakers: any[]) => {
            setAgentState(speakers.some(s => !s.isLocal) ? 'speaking' : 'idle');
        };
        room.on(RoomEvent.ActiveSpeakersChanged, fn);
        return () => { room.off(RoomEvent.ActiveSpeakersChanged, fn); };
    }, [room]);

    const handleUserMessage = (text: string) => {
        setMessages(prev => [...prev, { role: 'user', text, timestamp: Date.now() }]);
        addLog("TRANSMITTING PACKET...");
    };

    return (
        <div className="relative h-full w-full bg-transparent text-white overflow-hidden flex flex-col items-center justify-between font-mono">

            <AnimatePresence>
                {showIntro && <IntroOverlay onComplete={() => setShowIntro(false)} />}
            </AnimatePresence>

            {/* Top Bar */}
            <div className="w-full p-6 flex justify-between items-center z-10 border-b border-white/5 bg-black/20 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-mono tracking-widest text-cyan-400/80">ALAN SYSTEM V2.0</span>
                </div>
                <AutonomyIndicator level={2} />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex w-full relative overflow-hidden">

                {/* Visual Center */}
                <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-500`}>
                    <div className="relative z-10 scale-125 mb-12">
                        <ArcReactor state={agentState} volume={volume || 0} />
                    </div>
                </div>

                {/* Right Side Panel: Camera + Chat History (If active) */}
                <div className="absolute right-0 top-0 bottom-0 w-96 p-4 flex flex-col gap-4 z-20 pointer-events-none">
                    {/* Camera Feed */}
                    {localVideoTrack && (
                        <div className="w-full aspect-video bg-black/60 border border-cyan-500/20 rounded-xl overflow-hidden relative shadow-[0_0_20px_rgba(0,255,255,0.1)] pointer-events-auto">
                            <VideoTrack
                                trackRef={{
                                    participant: localParticipant,
                                    source: Track.Source.Camera,
                                    publication: localParticipant.getTrackPublication(Track.Source.Camera)!
                                }}
                                className="w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute top-2 left-2 text-[10px] text-cyan-400 bg-black/50 px-2 rounded">CAM_01</div>
                            {/* Reticle */}
                            <div className="absolute inset-4 border border-cyan-500/30 border-dashed rounded opacity-50" />
                        </div>
                    )}

                    {/* Chat History Overlay */}
                    <div className="flex-1 min-h-0 relative pointer-events-auto flex flex-col justify-end">
                        <div
                            ref={scrollRef}
                            className="w-full max-h-[400px] overflow-y-auto space-y-3 p-2 no-scrollbar"
                        >
                            <AnimatePresence initial={false}>
                                {messages.map((m) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={m.timestamp}
                                        className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                                    >
                                        <div
                                            className={`max-w-[90%] p-3 rounded-lg backdrop-blur-md text-sm border ${m.role === 'user'
                                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-100 rounded-br-none'
                                                    : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-100 rounded-bl-none'
                                                }`}
                                        >
                                            {m.text}
                                        </div>
                                        <span className="text-[10px] text-gray-500 mt-1 uppercase">{m.role}</span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="w-full p-8 z-10 flex items-end justify-between gap-8 relative">

                {/* System Logs (Bottom Left) */}
                <div className="hidden md:flex flex-col w-64 h-32 text-[10px] font-mono text-cyan-600/60 overflow-hidden border-l border-cyan-500/20 pl-2">
                    <div className="text-cyan-400 mb-1 border-b border-cyan-500/20 pb-1">SYSTEM LOGS</div>
                    {logs.map((L, i) => (
                        <div key={i} className="truncate">{L}</div>
                    ))}
                </div>

                {/* Input Area (Center) */}
                <div className="flex-1 flex flex-col items-center gap-6">
                    <div className="w-full max-w-xl">
                        <ChatInput onSend={handleUserMessage} />
                    </div>
                    <ControlGrid />
                </div>

                {/* Right Placeholder to balance logs */}
                <div className="hidden md:block w-64"></div>
            </div>
        </div>
    );
}
