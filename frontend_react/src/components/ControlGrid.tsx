import { useState } from 'react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { Mic, MicOff, Video, VideoOff, Monitor, Settings, Power } from 'lucide-react';

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
        <div className="flex items-center justify-center gap-4 p-3 bg-black/60 border border-white/10 backdrop-blur-md rounded-full shadow-2xl mb-8">
            <ControlButton icon={micOn ? <Mic size={20} /> : <MicOff size={20} />} active={micOn} onClick={toggleMic} />
            <ControlButton icon={camOn ? <Video size={20} /> : <VideoOff size={20} />} active={camOn} onClick={toggleCam} />
            <ControlButton icon={<Monitor size={20} />} active={screenOn} onClick={toggleScreen} />
            <div className="w-px h-6 bg-white/20 mx-2"></div>
            <ControlButton icon={<Settings size={20} />} onClick={() => alert("Settings Panel")} />
            <ControlButton icon={<Power size={20} />} warn onClick={disconnect} />
        </div>
    )
}

const ControlButton = ({ icon, active, warn, onClick }: any) => (
    <button onClick={onClick} className={`p-3 rounded-full transition-all duration-300
         ${active ? 'bg-primary text-black shadow-[0_0_15px_var(--primary)]' : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'}
         ${warn ? '!bg-red-500/20 !text-red-500 hover:!bg-red-500 hover:!text-white' : ''}
    `}>
        {icon}
    </button>
);
