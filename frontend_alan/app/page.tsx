'use client';

import { useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { IntroPage } from '@/components/IntroPage';
import { ALANInterface } from '@/components/ALANInterface';

export default function Home() {
    const [token, setToken] = useState('');
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(false);

    const connect = async () => {
        setLoading(true);
        // Enable Audio
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') await ctx.resume();

        try {
            const resp = await fetch('/api/token?room=alan-room&username=user-frontend');
            const data = await resp.json();
            if (data.token) {
                setToken(data.token);
                setConnected(true);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="h-screen w-screen bg-black flex items-center justify-center font-mono text-cyan-500">
                <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
            </div>
        )
    }

    if (!connected || !token) {
        return <IntroPage onConnect={connect} />;
    }

    return (
        <LiveKitRoom
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            connect={true}
            audio
            video={false}
            data-lk-theme="default"
            className="h-screen w-screen bg-black text-white font-mono overflow-hidden"
        >
            <ALANInterface />
            <RoomAudioRenderer />
        </LiveKitRoom>
    );
}
