import { Chat } from '@livekit/components-react';
import React, { useState } from 'react';
import { MessageSquare, Terminal } from 'lucide-react';

export const Sidebar = () => {
    return (
        <div className="h-full flex flex-col border-r border-white/10 bg-black/60 backdrop-blur w-80">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center gap-2 text-primary font-bold tracking-widest text-xs">
                <Terminal size={14} />
                <span>SYSTEM LOGS & COMMS</span>
            </div>

            {/* System Status Panel (Alan/TARS Style) */}
            <div className="p-4 flex flex-col gap-2 border-b border-white/10 text-[10px] text-gray-400 font-mono tracking-wider">
                <div className="flex justify-between items-center">
                    <span>MEMORY CORE</span>
                    <span className="text-green-400">ONLINE</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded overflow-hidden">
                    <div className="h-full bg-green-500/50 w-[80%]"></div>
                </div>

                <div className="flex justify-between items-center mt-2">
                    <span>WINDOWS LINK</span>
                    <span className="text-blue-400">ACTIVE</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded overflow-hidden">
                    <div className="h-full bg-blue-500/50 w-[100%]"></div>
                </div>

                <div className="flex justify-between items-center mt-2">
                    <span>ANDROID BRIDGE</span>
                    <span className="text-yellow-400">STANDBY</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded overflow-hidden">
                    <div className="h-full bg-yellow-500/50 w-[20%] animate-pulse"></div>
                </div>
            </div>

            {/* Chat Component provided by LiveKit - handles transcripts usually if configured */}
            <div className="flex-1 overflow-hidden relative">
                <Chat
                    style={{ height: '100%', fontFamily: 'inherit', background: 'transparent' }}
                    messageFormatter={(msg) => msg}
                />
            </div>
        </div>
    );
};
