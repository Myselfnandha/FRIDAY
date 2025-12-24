'use client';

import React from 'react';
import { useState } from 'react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, ChevronDown } from 'lucide-react';

export const ControlGrid = () => {
    const { localParticipant } = useLocalParticipant();
    const room = useRoomContext();
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(false);
    const [screenOn, setScreenOn] = useState(false);

    const toggleMic = () => {
        const newState = !micOn;
        setMicOn(newState);
        localParticipant.setMicrophoneEnabled(newState);
    }

    const toggleCam = () => {
        const newState = !camOn;
        setCamOn(newState);
        localParticipant.setCameraEnabled(newState);
    }

    const toggleScreen = () => {
        const newState = !screenOn;
        setScreenOn(newState);
        localParticipant.setScreenShareEnabled(newState);
    }

    const disconnect = async () => {
        try {
            await room.disconnect();
        } catch (e) {
            console.error("Disconnect error:", e);
        } finally {
            window.location.reload();
        }
    }

    return (
        <div className="flex items-center justify-center gap-3 p-2 bg-black/60 border border-white/10 backdrop-blur-md rounded-full shadow-2xl mb-8">
            {/* Mic with Config */}
            <div className="flex items-center bg-white/5 rounded-full pl-1 pr-2 gap-1 group">
                <ControlButton icon={micOn ? <Mic size={18} /> : <MicOff size={18} />} active={micOn} onClick={toggleMic} />
                <div className="text-gray-500 hover:text-white cursor-pointer p-1"><ChevronDown size={14} /></div>
            </div>

            {/* Cam with Config */}
            <div className="flex items-center bg-white/5 rounded-full pl-1 pr-2 gap-1 group">
                <ControlButton icon={camOn ? <Video size={18} /> : <VideoOff size={18} />} active={camOn} onClick={toggleCam} />
                <div className="text-gray-500 hover:text-white cursor-pointer p-1"><ChevronDown size={14} /></div>
            </div>

            <ControlButton icon={<Monitor size={20} />} active={screenOn} onClick={toggleScreen} />

            <div className="w-px h-6 bg-white/20 mx-2"></div>

            {/* End Call Pill */}
            <button
                onClick={disconnect}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all font-bold text-xs tracking-wider"
            >
                <PhoneOff size={16} />
                <span>END CALL</span>
            </button>
        </div>
    )
}

const ControlButton = ({ icon, active, onClick }: any) => (
    <button onClick={onClick} className={`p-3 rounded-full transition-all duration-300
         ${active ? 'bg-primary text-black shadow-[0_0_15px_var(--primary)]' : 'bg-transparent text-gray-300 hover:bg-white/10 hover:text-white'}
    `}>
        {icon}
    </button>
);
