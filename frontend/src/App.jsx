import { useState, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useVoiceAssistant,
  useTrackTranscription,
} from '@livekit/components-react';
import { Mic, MicOff, Video, VideoOff, MessageSquare, MonitorUp, PhoneOff, Send, ChevronDown } from 'lucide-react';
import { SpeedInsights } from "@vercel/speed-insights/react";
import './index.css';

// Hardcoded Default Backend for Instant Launch
const DEFAULT_BACKEND_URL = "https://nandhaalagesan248-friday.hf.space";

export default function App() {
  const [token, setToken] = useState("");
  const [url, setUrl] = useState("");
  const [connected, setConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState("");

  // Auto-connect on startup
  useEffect(() => {
    const autoConnect = async () => {
      setIsInitializing(true);
      try {
        console.log("Auto-connecting to:", DEFAULT_BACKEND_URL);
        const response = await fetch(`${DEFAULT_BACKEND_URL}/api/token`);

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        if (data.token && data.url) {
          setToken(data.token);
          setUrl(data.url);
          setConnected(true); // Auto-connect immediately
        } else {
          throw new Error("Invalid token response");
        }
      } catch (e) {
        console.error("Auto-connect failed:", e);
        setError(e.message);
      } finally {
        setIsInitializing(false);
      }
    };

    autoConnect();
  }, []);

  return (
    <div className="sci-fi-bg">
      <SpeedInsights />
      {/* Background Animated Lines */}
      {[...Array(10)].map((_, i) => (
        <div key={i} className="vertical-line" style={{ left: `${i * 10 + 5}%`, animationDelay: `${i * 0.5}s`, height: `${Math.random() * 100 + 50}px` }}></div>
      ))}

      {!connected ? (
        // Loading / Error Screen
        <div className="connect-container">
          <div className="reactor-container" style={{ transform: 'scale(0.8)' }}>
            <div className="reactor-ring outer"></div>
            <div className="reactor-ring inner"></div>
            <div className="reactor-ticks"></div>
            <div className="reactor-core" style={{ animationDuration: '0.5s' }}></div>
            <div style={{ position: 'absolute', zIndex: 2, textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: '#00d9ff', borderRadius: '50%', boxShadow: '0 0 40px #00d9ff', opacity: 0.8, margin: '0 auto' }}></div>
            </div>
          </div>

          <h2 style={{ marginTop: '2rem', fontSize: '1.2rem', color: '#fff', fontWeight: 400 }}>
            {isInitializing ? "ESTABLISHING UPLINK..." : (token ? "SYSTEM READY" : "CONNECTION INTERRUPTED")}
          </h2>

          {error && (
            <div style={{ marginTop: '20px', color: '#ffaaaa', textAlign: 'center', maxWidth: '300px' }}>
              <p>Could not auto-connect to FRIDAY.</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Error: {error}</p>

              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '0.9rem', color: '#fff' }}>Manual Override:</p>
                <ManualConnect setConnected={setConnected} setToken={setToken} setUrl={setUrl} />
              </div>
            </div>
          )}
        </div>
      ) : (
        // Main Interface
        <LiveKitRoom
          video={false}
          audio={true}
          token={token}
          serverUrl={url}
          connectOptions={{ autoSubscribe: true }}
          data-lk-theme="default"
          style={{ height: '100vh', width: '100%' }}
          onDisconnected={() => {
            console.log("Disconnected from room");
            setConnected(false);
          }}
          onError={(e) => {
            console.error("LiveKit Room Error:", e);
            setError(e.message || "Connection failed");
            setConnected(false);
          }}
        >
          <FridayInterface setConnected={setConnected} />
          <RoomAudioRenderer />
        </LiveKitRoom>
      )}
    </div>
  );
}

// Fallback component only shown if auto-connect fails
function ManualConnect({ setConnected, setToken, setUrl }) {
  const [inputUrl, setInputUrl] = useState(DEFAULT_BACKEND_URL);
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${inputUrl}/api/token`);
      const data = await res.json();
      if (data.token && data.url) {
        setToken(data.token);
        setUrl(data.url);
        setConnected(true);
      }
    } catch (e) {
      alert("Failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      <input
        value={inputUrl}
        onChange={e => setInputUrl(e.target.value)}
        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid #555', color: 'white', padding: '8px', borderRadius: '4px' }}
      />
      <button onClick={handleFetch} style={{ cursor: 'pointer', background: '#00d9ff', border: 'none', borderRadius: '4px', padding: '0 10px' }}>
        {loading ? '...' : 'RETRY'}
      </button>
    </div>
  )
}


// ... (imports remain the same)

function FridayInterface({ setConnected }) {
  const { state, audioTrack } = useVoiceAssistant();
  const [inputText, setInputText] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const { localParticipant } = useLocalParticipant();
  const [toast, setToast] = useState(null);

  // UI Panels
  const [activePanel, setActivePanel] = useState(null); // 'memory', 'system', 'chat'

  // Manual Message State (for chat UI)
  const [chatMessages, setChatMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // Toast Helper
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Reliable Data Transmission
  const sendMessage = async (text) => {
    if (!localParticipant) return;
    setIsSending(true);
    try {
      // Create JSON payload compatible with backend parser
      const payload = JSON.stringify({ message: text });
      const data = new TextEncoder().encode(payload);

      await localParticipant.publishData(data, { reliable: true });

      // Optimistic UI Update
      setChatMessages(prev => [...prev, {
        message: text,
        timestamp: Date.now(),
        from: { identity: localParticipant.identity }
      }]);

      showToast("Command Sent");
    } catch (e) {
      console.error("Transmission Error:", e);
      showToast("Transmission Failed");
    } finally {
      setIsSending(false);
    }
  };

  // Effect to toggle mic
  useEffect(() => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(micOn).catch(e => console.error("Mic Error:", e));
    }
  }, [micOn, localParticipant]);

  // Toggle Camera
  const toggleCamera = async () => {
    try {
      const newState = !cameraOn;
      await localParticipant.setCameraEnabled(newState);
      setCameraOn(newState);
      showToast(newState ? "Camera Module: Online" : "Camera Module: Offline");
    } catch (e) {
      showToast("Error: Camera Module Failed");
      console.error(e);
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    try {
      const newState = !screenShareOn;
      await localParticipant.setScreenShareEnabled(newState);
      setScreenShareOn(newState);
      showToast(newState ? "Screen Mirroring: Active" : "Screen Mirroring: Offline");
    } catch (e) {
      showToast("Error: Screen Share Failed");
      console.error(e);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    await sendMessage(inputText);
    setInputText("");
  };

  const executeSystemCommand = async (cmd) => {
    showToast(`Executing: ${cmd}`);
    await sendMessage(`Execute system command: ${cmd}`);
  };

  // Greeting State
  const [showGreeting, setShowGreeting] = useState(false);
  const scrollRef = useRef(null);

  // Trigger greeting on connect
  useEffect(() => {
    if (connected) {
      setShowGreeting(true);
      // Auto-hide greeting is handled by CSS animation, but state cleanup is good practice
      setTimeout(() => setShowGreeting(false), 6000);
    }
  }, [connected]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  return (
    <div className="friday-ui-container">
      {/* LEFT SIDEBAR: CHAT & CONTROLS */}
      <div className="sidebar">
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(0, 217, 255, 0.15)', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#00d9ff', letterSpacing: '4px' }}>FRIDAY</h1>
          <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '5px', letterSpacing: '1px' }}>SYSTEM ONLINE</div>
        </div>

        {/* Chat Area */}
        <div className="chat-panel" ref={scrollRef}>
          {chatMessages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#444', marginTop: '50px', fontStyle: 'italic' }}>
              Awaiting neural input...
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.from?.identity === localParticipant?.identity ? 'user' : 'assistant'}`}>
              {msg.message}
            </div>
          ))}
        </div>

        {/* Bottom Controls Dock */}
        <div className="sidebar-controls">
           {/* Input */}
           <div className="input-group" style={{ marginBottom: '10px' }}>
             <input
               className="input-field"
               placeholder="Enter command..."
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             />
             <button onClick={handleSend} disabled={isSending} style={{ background: 'transparent', border: 'none', color: '#00d9ff', cursor: 'pointer' }}>
               <Send size={18} />
             </button>
           </div>

           {/* Toolbar Grid */}
           <div className="toolbar-grid">
             <button className={`icon-btn ${micOn ? '' : 'active'}`} onClick={() => setMicOn(!micOn)} title="Mic">
               {micOn ? <Mic size={18} /> : <MicOff size={18} />}
             </button>
             <button className={`icon-btn ${cameraOn ? 'active' : ''}`} onClick={toggleCamera} title="Cam">
               {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
             </button>
             <button className={`icon-btn ${screenShareOn ? 'active' : ''}`} onClick={toggleScreenShare} title="Screen">
               <MonitorUp size={18} />
             </button>
             <button className={`icon-btn ${activePanel ? 'active' : ''}`} onClick={() => setActivePanel('modules')} title="Modules">
               <MessageSquare size={18} />
             </button>
             <button className="icon-btn danger" onClick={() => setConnected(false)} title="Disconnect">
               <PhoneOff size={18} />
             </button>
           </div>
        </div>
      </div>

      {/* MAIN STAGE: VISUALIZER */}
      <div className="main-stage">
         {/* System Greeting */}
         {showGreeting && (
           <div className="system-greeting">
             SYSTEM ONLINE
             <div style={{ fontSize: '1rem', marginTop: '10px', color: '#fff', opacity: 0.7, letterSpacing: '2px' }}>WELCOME BACK, SIR</div>
           </div>
         )}
         
         {/* Toast Notification */}
         {toast && (
           <div style={{
             position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
             background: 'rgba(0, 217, 255, 0.2)', color: '#fff', padding: '8px 16px',
             borderRadius: '20px', backdropFilter: 'blur(5px)', border: '1px solid rgba(0, 217, 255, 0.5)',
             zIndex: 100, fontSize: '0.9rem', boxShadow: '0 0 15px rgba(0, 217, 255, 0.3)'
           }}>
             {toast}
           </div>
         )}

         {/* Visualizer */}
         <div className="reactor-container" style={{ transform: 'scale(1.2)' }}>
           <div className="reactor-ring outer"></div>
           <div className="reactor-ring inner"></div>
           <div className="reactor-ticks"></div>
           <div className="reactor-core" style={{
             transform: state === 'speaking' ? 'scale(1.5)' : 'scale(1)',
             animationDuration: state === 'speaking' ? '0.5s' : '2s'
           }}></div>
         </div>

         {/* Status Text */}
         <div style={{ marginTop: '80px', textAlign: 'center', height: '30px' }}>
           {state === 'listening' ? (
             <div style={{ color: '#00d9ff', fontWeight: 'bold', letterSpacing: '2px', animation: 'pulse-text 2s infinite' }}>LISTENING...</div>
           ) : state === 'speaking' ? (
             <div style={{ color: '#ff00ff', fontWeight: 'bold', letterSpacing: '2px' }}>PROCESSING...</div>
           ) : (
             <div style={{ color: '#555', fontSize: '0.8rem', letterSpacing: '1px' }}>IDLE</div>
           )}
         </div>

         {/* Module Overlay (if active) */}
         {activePanel === 'modules' && (
            <ControlPanel onClose={() => setActivePanel(null)} onCommand={executeSystemCommand} />
         )}
      </div>

      {/* Inline Styles for Panels */}
      <style>{`
        /* Keeping styles for ControlPanel just in case it's used elsewhere, but mainly relying on new CSS */
      `}</style>
    </div>
  )
}
// Add simple keyframe for text pulse if not present
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse-text {
    0% { opacity: 0.5; }
    50% { opacity: 1; text-shadow: 0 0 10px #00d9ff; }
    100% { opacity: 0.5; }
  }
`;
document.head.appendChild(style);

function ControlPanel({ onClose, onCommand }) {
  const [activeTab, setActiveTab] = useState('windows');

  const tabs = [
    { id: 'windows', label: 'WINDOWS' },
    { id: 'android', label: 'ANDROID' },
    { id: 'memory', label: 'MEMORY' },
  ];

  const modules = {
    windows: [
      { label: 'Open Notepad', cmd: 'Open Notepad on Windows' },
      { label: 'Open Calculator', cmd: 'Open Calculator on Windows' },
      { label: 'Open Chrome', cmd: 'Open Chrome on Windows' },
      { label: 'Close Notepad', cmd: 'Close Notepad on Windows' },
    ],
    android: [
      { label: 'Open WhatsApp', cmd: 'Open package com.whatsapp on Android' },
      { label: 'Open YouTube', cmd: 'Open package com.google.android.youtube on Android' },
      { label: 'Google Assistant', cmd: 'Ask Android Assistant to listen' },
      { label: 'Kill WhatsApp', cmd: 'Close package com.whatsapp on Android' },
    ],
    memory: [
      { label: 'Save Context', cmd: 'Save current context to memory' },
      { label: 'Recall Deployment', cmd: 'Recall memory about deployment issues' },
      { label: 'Recall User Prefs', cmd: 'Recall user preferences' },
    ],
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(10, 10, 15, 0.95)', zIndex: 150, display: 'flex', flexDirection: 'column',
      padding: '40px', boxSizing: 'border-box', backdropFilter: 'blur(10px)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        <h2 style={{ color: '#00d9ff', margin: 0, letterSpacing: '2px' }}>SYSTEM MODULES</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #555', color: '#fff', cursor: 'pointer', padding: '5px 15px', borderRadius: '4px' }}>CLOSE</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '10px', background: activeTab === tab.id ? 'rgba(0, 217, 255, 0.2)' : 'rgba(255,255,255,0.05)',
              border: activeTab === tab.id ? '1px solid #00d9ff' : '1px solid #333', color: '#fff', cursor: 'pointer',
              fontWeight: 'bold', borderRadius: '4px', transition: 'all 0.3s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px', overflowY: 'auto' }}>
        {modules[activeTab].map((mod, i) => (
          <button
            key={i}
            onClick={() => onCommand(mod.cmd)}
            className="module-btn"
            style={{
              padding: '20px', background: 'rgba(0,0,0,0.4)', border: '1px solid #00d9ff',
              color: '#00d9ff', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '10px', transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
          >
            {/* You could add icons here based on label */}
            <span style={{ fontWeight: '600' }}>{mod.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
