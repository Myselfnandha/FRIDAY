'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useLocalParticipant } from '@livekit/components-react';

export const ChatInput = () => {
    const [msg, setMsg] = useState('');
    const { localParticipant } = useLocalParticipant();

    const handleSend = async () => {
        if (!msg.trim()) return;

        if (localParticipant) {
            // Send data to the room (Agent receives this)
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify({ type: 'user_chat', text: msg }));
            await localParticipant.publishData(data, { reliable: true });
        }

        setMsg('');
    };

    return (
        <div className="w-full max-w-md bg-black/50 backdrop-blur-md rounded-full border border-white/10 p-1 flex items-center gap-2 transition-all hover:border-white/20 focus-within:border-primary/50 focus-within:shadow-[0_0_15px_rgba(0,255,255,0.1)]">
            <input
                type="text"
                className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-sm text-white placeholder-gray-500 font-mono"
                placeholder="Type a message..."
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
                onClick={handleSend}
                className="p-2 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-full transition-colors"
            >
                <Send size={16} />
            </button>
        </div>
    );
};
