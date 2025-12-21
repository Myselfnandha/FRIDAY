import React, { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';

export const SessionMemory: React.FC = () => {
    const room = useRoomContext();
    const [lastLog, setLastLog] = useState<string>("Initializing Neural Link...");

    useEffect(() => {
        if (!room) return;

        const handleData = (payload: Uint8Array) => {
            const str = new TextDecoder().decode(payload);
            try {
                const json = JSON.parse(str);
                if (json.message) {
                    // Check if it's a system skill or tool execution log
                    if (json.message.includes("Opening") || json.message.includes("Closing") || json.message.includes("Sent")) {
                        setLastLog(json.message);
                    }
                }
            } catch (e) { }
        };

        room.on(RoomEvent.DataReceived, handleData);
        return () => {
            room.off(RoomEvent.DataReceived, handleData);
        };
    }, [room]);

    return (
        <div className="bg-black/80 border border-primary/30 p-3 w-64 rounded backdrop-blur font-mono text-xs">
            <div className="flex items-center gap-2 text-primary border-b border-white/10 pb-1 mb-2">
                <Database size={14} />
                <span className="tracking-widest font-bold">ACTIVE MEMORY</span>
            </div>
            <div className="text-gray-300 break-words leading-relaxed min-h-[30px]">
                <span className="text-secondary mr-2">{'>'}</span>
                {lastLog}
            </div>
        </div>
    );
};
