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
