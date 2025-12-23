import { useState, useEffect } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { PortfolioLayout } from '@/components/PortfolioLayout';
import { Sidebar } from '@/components/Sidebar';
import { IntroSection } from '@/components/IntroSection';
import { ALANInterface } from '@/components/ALANInterface';

export default function Home() {
    const [token, setToken] = useState('');
    const [connected, setConnected] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [isConnecting, setIsConnecting] = useState(false);

    const connectToAlan = async () => {
        setIsConnecting(true);
        // Enable Audio Context
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') await ctx.resume();

        try {
            const resp = await fetch('/api/token?room=alan-room&username=user-frontend');
            const data = await resp.json();
            if (data.token) {
                setToken(data.token);
                setConnected(true);
                setActiveTab('assistant');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsConnecting(false);
        }
    }

    return (
        <PortfolioLayout>
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="flex-1 relative h-full w-full overflow-hidden">
                {activeTab === 'home' && (
                    <IntroSection onStart={connectToAlan} />
                )}

                {activeTab === 'assistant' && (
                    <div className="h-full w-full flex flex-col p-4 md:p-8">
                        {connected && token ? (
                            <div className="w-full h-full rounded-3xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl relative">
                                <LiveKitRoom
                                    token={token}
                                    serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                                    connect={true}
                                    audio
                                    video={false}
                                    data-lk-theme="default"
                                    className="h-full w-full"
                                >
                                    <ALANInterface />
                                    <RoomAudioRenderer />
                                </LiveKitRoom>
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center text-blue-400 font-mono animate-pulse">
                                {isConnecting ? "INITIALIZING UPLINK..." : "SYSTEM STANDBY - PLEASE CONNECT FROM HOME"}
                            </div>
                        )}
                    </div>
                )}

                {/* Placeholders for other tabs */}
                {(activeTab === 'projects' || activeTab === 'about') && (
                    <div className="flex h-full items-center justify-center text-gray-500 font-mono">
                        [MODULE UNDER CONSTRUCTION]
                    </div>
                )}
            </main>
        </PortfolioLayout>
    );
}
