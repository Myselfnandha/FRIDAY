import { useEffect, useState } from 'react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { Mic, MicOff, Video, VideoOff, Monitor, Settings, Power, X } from 'lucide-react';

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

    const disconnect = () => {
        room.disconnect();
        window.location.reload(); // Simple way to reset state
    }

    return (
        <div className="grid grid-cols-5 gap-3 p-4 bg-black/40 border-t border-white/10 backdrop-blur w-full max-w-3xl rounded-t-xl mb-0">
            <ControlButton icon={micOn ? <Mic /> : <MicOff />} label="VOICE" active={micOn} onClick={toggleMic} />
            <ControlButton icon={camOn ? <Video /> : <VideoOff />} label="VISION" active={camOn} onClick={toggleCam} />
            <ControlButton icon={<Monitor />} label="SCREEN" active={screenOn} onClick={toggleScreen} />
            <ControlButton icon={<Settings />} label="CONFIG" active={false} onClick={() => alert("Settings Panel")} />
            <ControlButton icon={<Power />} label="ABORT" active={false} warn onClick={disconnect} />
        </div>
    )
}

const ControlButton = ({ icon, label, active, warn, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-2 p-3 rounded border border-white/10 uppercase text-[10px] tracking-widest transition-all
         ${active ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_10px_rgba(0,217,255,0.2)]' : 'bg-transparent text-gray-500 hover:text-white hover:bg-white/5'}
         ${warn ? 'hover:bg-red-500/20 hover:text-red-500 hover:border-red-500' : ''}
    `}>
        {icon}
        <span>{label}</span>
    </button>
);
