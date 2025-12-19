import { useState, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useVoiceAssistant,
  useChat,
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
          // setConnected(true); // Removed auto-jump to avoid AudioContext issues
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

  const handleStart = () => {
    setConnected(true);
  };

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

          {token && !connected && (
            <button
              onClick={handleStart}
              style={{
                marginTop: '20px',
                background: 'rgba(0, 217, 255, 0.2)',
                border: '1px solid #00d9ff',
                color: '#00d9ff',
                padding: '10px 30px',
                fontSize: '1rem',
                letterSpacing: '2px',
                cursor: 'pointer',
                clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)',
                transition: 'all 0.3s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 217, 255, 0.4)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(0, 217, 255, 0.2)'}
            >
              ENGAGE
            </button>
          )}

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
          data-lk-theme="default"
          style={{ height: '100vh', width: '100%' }}
          onDisconnected={() => setConnected(false)}
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

  // Chat Hook (Handles real-time messages with the Room)
  const { send, chatMessages, isSending } = useChat();

  // Toast Helper
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
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
    try {
      // Send to LiveKit Chat (Agent should listen to this)
      await send(inputText);
      setInputText("");
      showToast("Command Transmitted");
    } catch (e) {
      showToast("Transmission Failed");
      console.error(e);
    }
  };

  const executeSystemCommand = async (cmd) => {
    showToast(`Executing: ${cmd}`);
    try {
      // Send as a chat message which the agent interprets as an instruction
      await send(`Execute system command: ${cmd}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="friday-ui-container">
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

      {/* PANELS OVERLAY */}
      {activePanel === 'memory' && (
        <div className="panel-overlay">
          <h2 className="panel-header">CORE MEMORY BANKS</h2>
          <div className="panel-content">
            <p style={{ color: '#8b9bb4', fontSize: '0.9rem' }}>Retrieving stored context nodes...</p>
            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Placeholder Memories */}
              {["User prefers verified Python solutions.", "System Mode: Jarvis/Friday Hybrid", "Project Path: C:\\Users\\VOYAGER\\Desktop\\FRIDAY"].map((m, i) => (
                <div key={i} style={{ background: 'rgba(0,255,157,0.1)', borderLeft: '3px solid #00ff9d', padding: '10px', fontSize: '0.9rem' }}>
                  {m}
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => setActivePanel(null)} className="panel-close-btn">CLOSE HUB</button>
        </div>
      )}

      {activePanel === 'system' && (
        <div className="panel-overlay">
          <h2 className="panel-header">SYSTEM CONTROL MODULE</h2>
          <div className="panel-content grid-layout">
            <button className="sys-btn" onClick={() => executeSystemCommand("Open Calculator")}>
              🔢 Calculator
            </button>
            <button className="sys-btn" onClick={() => executeSystemCommand("Open Notepad")}>
              📝 Notepad
            </button>
            <button className="sys-btn" onClick={() => executeSystemCommand("Check System Status")}>
              📊 System Status
            </button>
            <button className="sys-btn" onClick={() => executeSystemCommand("Close Active Window")}>
              ❌ Close Window
            </button>
            <button className="sys-btn" onClick={() => executeSystemCommand("Open Browser")}>
              🌐 Web Browser
            </button>
            <button className="sys-btn" onClick={() => executeSystemCommand("Terminal")}>
              💻 Terminal
            </button>
          </div>
          <button onClick={() => setActivePanel(null)} className="panel-close-btn">CLOSE CONTROLS</button>
        </div>
      )}

      {/* Real-time Voice Caption Header */}
      <div style={{ marginTop: '60px', textAlign: 'center', height: '40px' }}>
        {state === 'listening' ? (
          <div style={{ color: '#00d9ff', fontWeight: 'bold', letterSpacing: '1px', animation: 'pulse-text 2s infinite' }}>LISTENING...</div>
        ) : state === 'speaking' ? (
          <div style={{ color: '#ff00ff', fontWeight: 'bold', letterSpacing: '1px' }}>FRIDAY SPEAKING...</div>
        ) : (
          <div style={{ color: '#555', fontSize: '0.8rem' }}>AWAITING INPUT</div>
        )}
      </div>

      {/* Main Visualizer Area */}
      <div className="reactor-container">
        <div className="reactor-ring outer"></div>
        <div className="reactor-ring inner"></div>
        <div className="reactor-ticks"></div>
        <div className="reactor-core" style={{
          transform: state === 'speaking' ? 'scale(1.5)' : 'scale(1)',
          animationDuration: state === 'speaking' ? '0.5s' : '2s'
        }}></div>
      </div>

      {/* Chat / Messages Overlay */}
      {/* Show last 3 messages always if not in a panel */}
      {!activePanel && (
        <div className="chat-overlay">
          {chatMessages.length === 0 && <div className="chat-message assistant">Systems online. Ready.</div>}
          {chatMessages.slice(-3).map((msg) => (
            <div key={msg.timestamp} className={`chat-message ${msg.from?.identity === localParticipant?.identity ? 'user' : 'assistant'}`}>
              {msg.message}
            </div>
          ))}
        </div>
      )}

      {/* Dropdown / Spacer */}
      <div style={{ flex: 1 }}></div>

      {/* Bottom Control Bar */}
      <div className="control-bar">
        {/* Input Field */}
        <div className="input-group">
          <input
            className="input-field"
            placeholder="Type command..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} disabled={isSending} style={{ background: '#333', border: 'none', borderRadius: '12px', padding: '6px 12px', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            {isSending ? '...' : 'SEND'}
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`icon-btn ${micOn ? '' : 'active'}`} onClick={() => setMicOn(!micOn)} title="Toggle Microphone">
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button className={`icon-btn ${cameraOn ? 'active' : ''}`} onClick={toggleCamera} title="Camera Module">
            {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button className={`icon-btn ${screenShareOn ? 'active' : ''}`} onClick={toggleScreenShare} title="Screen Mirroring">
            <MonitorUp size={20} />
          </button>

          {/* System Control Button */}
          <button className={`icon-btn ${activePanel === 'system' ? 'active' : ''}`} onClick={() => setActivePanel(activePanel === 'system' ? null : 'system')} title="System Controls">
            <ChevronDown size={20} style={{ transform: activePanel === 'system' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
          </button>

          {/* Memory Button */}
          <button className={`icon-btn ${activePanel === 'memory' ? 'active' : ''}`} onClick={() => setActivePanel(activePanel === 'memory' ? null : 'memory')} title="Memory Banks">
            <MessageSquare size={20} />
          </button>

          <button className="icon-btn danger" onClick={() => setConnected(false)} title="Disconnect">
            <PhoneOff size={20} />
          </button>
        </div>
      </div>

      {/* Inline Styles for Panels */}
      <style>{`
        .panel-overlay {
            position: absolute; top: 10%; left: 50%; transform: translateX(-50%);
            width: 80%; max-width: 500px; height: 60%;
            background: rgba(10, 15, 30, 0.95);
            border: 1px solid #00d9ff;
            border-radius: 15px;
            z-index: 50;
            display: flex; flex-direction: column;
            padding: 20px;
            box-shadow: 0 0 30px rgba(0, 217, 255, 0.2);
            backdrop-filter: blur(10px);
        }
        .panel-header {
            color: #00d9ff; border-bottom: 1px solid rgba(0, 217, 255, 0.3); padding-bottom: 10px; margin-top: 0; text-align: center; font-size: 1.2rem; letter-spacing: 2px;
        }
        .panel-content {
            flex: 1; overflow-y: auto; padding-top: 20px;
        }
        .panel-close-btn {
             background: transparent; border: 1px solid #ff3b30; color: #ff3b30; padding: 10px; border-radius: 8px; cursor: pointer; margin-top: 10px; letter-spacing: 1px; font-weight: bold; transition: all 0.2s;
        }
        .panel-close-btn:hover { background: #ff3b30; color: white; }
        .grid-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .sys-btn {
            background: rgba(255,255,255,0.05); border: 1px solid #333; color: white; padding: 15px; border-radius: 10px; cursor: pointer; transition: all 0.2s; text-align: left;
        }
        .sys-btn:hover { background: rgba(0, 217, 255, 0.1); border-color: #00d9ff; }
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
