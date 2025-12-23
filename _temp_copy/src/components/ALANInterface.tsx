'use client';

import { useEffect, useState } from 'react';
import {
    useRoomContext,
    useVoiceAssistant,
    useTrackVolume,
    useLocalParticipant,
    VideoTrack
} from '@livekit/components-react';
import { RoomEvent, Track } from 'livekit-client';

import { ArcReactor } from './ArcReactor';
import { AutonomyIndicator } from './AutonomyIndicator';
import { ControlGrid } from './ControlGrid';
import { ChatInput } from './ChatInput';
import { useCaptions } from './useCaptions';

export function ALANInterface() {
    const room = useRoomContext();
    const { state, audioTrack } = useVoiceAssistant();
    const volume = useTrackVolume(audioTrack);
    const { localParticipant } = useLocalParticipant();

    const caption = useCaptions();
    const [agentState, setAgentState] =
        useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');

    const [localVideoTrack, setLocalVideoTrack] = useState<Track | undefined>(undefined);

    useEffect(() => {
        if (localParticipant) {
            const updateTrack = () => {
                const trackPub = localParticipant.getTrackPublication(Track.Source.Camera);
                setLocalVideoTrack(trackPub?.track);
            }
            // Listen to changes
            localParticipant.on(RoomEvent.LocalTrackPublished, updateTrack);
            localParticipant.on(RoomEvent.LocalTrackUnpublished, updateTrack);
            // Initial check
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

    return (
        <div className="relative h-full w-full bg-transparent text-white overflow-hidden flex flex-col items-center justify-between">

            {/* Top Bar */}
            <div className="w-full p-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm font-mono tracking-widest text-primary/80">ALAN SYSTEM ONLINE</span>
                </div>
                <AutonomyIndicator level={2} />
            </div>

            {/* Center Visuals */}
            <div className="flex-1 flex w-full items-center justify-center p-8 gap-8">
                {/* Arc Reactor - shifts to left if video is present? Or just side-by-side */}
                <div className={`flex flex-col items-center justify-center transition-all duration-500 ${localVideoTrack ? 'w-1/2' : 'w-full'}`}>
                    <div className="scale-125 mb-8">
                        <ArcReactor state={agentState} volume={volume || 0} />
                    </div>

                    <div className="space-y-2 text-center">
                        <div className="text-xl font-light tracking-wide text-white/90">
                            {agentState === 'listening' && "I'm listening..."}
                            {agentState === 'thinking' && "Processing..."}
                            {agentState === 'speaking' && "Alan is speaking"}
                            {agentState === 'idle' && "Waiting for command"}
                        </div>
                        {caption && (
                            <div className="text-cyan-400/70 max-w-xl text-center mx-auto mt-4 text-md font-mono">
                                "{caption}"
                            </div>
                        )}
                    </div>
                </div>

                {/* Camera Feed (Right Side) */}
                {localVideoTrack && (
                    <div className="w-1/2 h-[60vh] bg-black/50 border border-white/10 rounded-2xl overflow-hidden relative shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-right-10">
                        <VideoTrack trackRef={{ participant: localParticipant, source: Track.Source.Camera }} className="w-full h-full object-cover" />
                        <div className="absolute top-4 left-4 text-xs font-mono bg-black/60 px-2 py-1 rounded text-white/70">
                            CAMERA FEED
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="mb-8 z-10 w-full flex flex-col items-center gap-4">
                <ChatInput />
                <ControlGrid />
            </div>
        </div>
    );
}
