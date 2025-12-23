import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useVoiceAssistant,
  useTrackVolume,
} from '@livekit/components-react';


import { RoomEvent } from 'livekit-client';

import { appConfig } from './app-config';
import { ArcReactor } from './components/ArcReactor';
import { AutonomyIndicator } from './components/AutonomyIndicator';
import { SessionMemory } from './components/SessionMemory';
import { AgentState } from './components/AgentState';
import { Sidebar } from './components/Sidebar';
import { ControlGrid } from './components/ControlGrid';

import { useCaptions } from './components/useCaptions';
import { useHotword } from './components/controls/useHotword.ts';

/* =========================
   APP ROOT
========================= */

export default function App() {
  const [token, setToken] = useState('');
  const [url, setUrl] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const backend =
          localStorage.getItem('backend_url') ||
          appConfig.defaultBackendUrl;

        const res = await fetch(`${backend}/api/token`);
        const data = await res.json();
        setToken(data.token);
        setUrl(data.url);
      } catch (e) {
        console.error('Token fetch failed', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading || !token) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center font-mono text-primary">
        <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect={connected}
      audio
      video={false}
      adaptiveStream
      dynacast
      publishDefaults={{ audioPreset: 'speech', red: false }}
      className="h-screen w-screen bg-black text-white font-mono overflow-hidden"
    >
      <MainInterface />

      <RoomAudioRenderer />

      {/* AUDIO UNLOCK GATE */}
      {!connected && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85">
          <button
            onClick={async () => {
              const ctx = new AudioContext();
              if (ctx.state === 'suspended') await ctx.resume();
              setConnected(true);
            }}
            className="px-8 py-4 bg-primary text-black font-bold tracking-widest rounded hover:bg-white transition"
          >
            INITIALIZE NEURAL LINK
          </button>
        </div>
      )}
    </LiveKitRoom>
  );
}

/* =========================
   MAIN INTERFACE
========================= */

function MainInterface() {
  const room = useRoomContext();
  const { state, audioTrack } = useVoiceAssistant();
  const volume = useTrackVolume(audioTrack);

  const caption = useCaptions();
  const [agentState, setAgentState] =
    useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');

  useEffect(() => {
    if (state) setAgentState(state as any);
  }, [state]);

  // Fallback speaker detection
  useEffect(() => {
    if (!room) return;
    const fn = (speakers: any[]) => {
      setAgentState(speakers.some(s => !s.isLocal) ? 'speaking' : 'idle');
    };
    room.on(RoomEvent.ActiveSpeakersChanged, fn);
    return () => room.off(RoomEvent.ActiveSpeakersChanged, fn);
  }, [room]);

  // HOTWORD: "Alan"
  useHotword(() => {
    console.log('Hotword detected: Alan');
  });

  return (
    <div className="relative h-full w-full flex">
      {/* Sidebar */}
      <div className="z-20 flex flex-col w-80 bg-black/70 backdrop-blur">
        <Sidebar />
        <SessionMemory />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="flex justify-between items-center p-6 border-b border-white/10">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {appConfig.title.toUpperCase()}
          </h1>
          <div className="flex items-center gap-4">
            <AgentState state={agentState} />
            <AutonomyIndicator level={2} />
          </div>
        </header>

        {/* Center */}
        <main className="flex-1 flex flex-col items-center justify-center relative">
          <div
            className={`transition-all duration-300 ${
              agentState === 'speaking'
                ? 'drop-shadow-[0_0_25px_#0ff]'
                : 'opacity-80'
            }`}
          >
            <ArcReactor state={agentState} volume={volume || 0} />
          </div>

          {/* CAPTIONS */}
          {caption && (
            <div className="absolute bottom-16 w-3/4 text-center text-cyan-300 bg-black/50 p-3 rounded backdrop-blur">
              {caption}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="p-4 flex justify-center">
          <ControlGrid />
        </footer>
      </div>
    </div>
  );
}
