import { useEffect, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';

export function useCaptions() {
  const room = useRoomContext();
  const [caption, setCaption] = useState('');

  useEffect(() => {
    if (!room) return;

    const onData = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === 'caption') setCaption(msg.text);
      } catch {}
    };

    room.on('dataReceived', onData);
    return () => room.off('dataReceived', onData);
  }, [room]);

  return caption;
}
