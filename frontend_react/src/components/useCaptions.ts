'use client';

import { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, DataPacket_Kind } from 'livekit-client';

export const useCaptions = () => {
    const room = useRoomContext();
    const [caption, setCaption] = useState('');

    useEffect(() => {
        if (!room) return;

        const handleData = (payload: Uint8Array, participant?: any, kind?: DataPacket_Kind, topic?: string) => {
            try {
                const decoder = new TextDecoder();
                const str = decoder.decode(payload);
                const data = JSON.parse(str);
                if (data.type === 'transcription' || data.type === 'agent_text') {
                    setCaption(data.text);
                    // Auto clear after 5s
                    setTimeout(() => setCaption(''), 5000);
                }
            } catch (e) {
                // ignore
            }
        };

        room.on(RoomEvent.DataReceived, handleData);
        return () => { room.off(RoomEvent.DataReceived, handleData); };
    }, [room]);

    return caption;
};
