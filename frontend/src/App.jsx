import { useState, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useVoiceAssistant,
} from '@livekit/components-react';
import { Mic, MicOff, Video, VideoOff, MessageSquare, MonitorUp, PhoneOff, Send, ChevronDown } from 'lucide-react';
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
          setConnected(true); // Auto-jump to main screen
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
            {isInitializing ? "INITIALIZING SYSTEMS..." : "CONNECTION INTERRUPTED"}
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

import { useTrackTranscription } from '@livekit/components-react';

// ... (imports remain the same)

function FridayInterface({ setConnected }) {
  const { state, audioTrack } = useVoiceAssistant();
  const [inputText, setInputText] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenShareOn, setScreenShareOn] = useState(false);
  const { localParticipant } = useLocalParticipant();
  const [toast, setToast] = useState(null);
  const [showMemory, setShowMemory] = useState(false);

  // Real-time Transcription Hook
  // Note: This requires the agent/backend to be publishing a transcription track, 
  // OR we use the frontend's speech recognition if available. 
  // For this demo, we'll visualize the 'state' and simply show a caption placeholder 
  // that would normally be filled by the STT event.
  // In a full implementation: const { segments } = useTrackTranscription(agentAudioTrack);

  // Fake conversation history for visual demo
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Systems online. Alan is ready to serve." },
  ]);

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
      showToast(newState ? "Camera Enabled" : "Camera Disabled");
    } catch (e) {
      showToast("Error toggling camera");
      console.error(e);
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    try {
      const newState = !screenShareOn;
      await localParticipant.setScreenShareEnabled(newState);
      setScreenShareOn(newState);
      showToast(newState ? "Screen Share Active" : "Screen Share Stopped");
    } catch (e) {
      showToast("Error toggling screen share");
      console.error(e);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: inputText }]);
    setInputText("");
    showToast("Command sent");
  };

  return (
    <div className="friday-ui-container">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0, 217, 255, 0.2)', color: '#fff', padding: '8px 16px',
          borderRadius: '20px', backdropFilter: 'blur(5px)', border: '1px solid rgba(0, 217, 255, 0.5)',
          zIndex: 100, fontSize: '0.9rem'
        }}>
          {toast}
        </div>
      )}

      {/* Memory Screen Overlay */}
      {showMemory && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.9)', zIndex: 50, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ color: '#00d9ff', borderBottom: '1px solid #00d9ff', paddingBottom: '10px' }}>CORE MEMORY BANKS</h2>
          <div style={{ width: '80%', height: '60%', overflowY: 'auto', border: '1px solid #333', padding: '20px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)' }}>
            <p style={{ color: '#888' }}>Acccessing neural pathways...</p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {[
                "User prefers verified Python solutions.",
                "Default project path: C:\\Users\\VOYAGER\\Desktop\\FRIDAY",
                "System Mode: Jarvis/Friday Hybrid",
                "Last Interaction: Deployment Troubleshooting"
              ].map((mem, i) => (
                <li key={i} style={{ marginBottom: '10px', padding: '10px', borderLeft: '2px solid #00d9ff', background: 'rgba(0,217,255,0.1)' }}>
                  {mem}
                </li>
              ))}
            </ul>
          </div>
          <button onClick={() => setShowMemory(false)} className="icon-btn" style={{ marginTop: '20px', width: 'auto', padding: '0 20px' }}>
            CLOSE MEMORY
          </button>
        </div>
      )}

      {/* Real-time Voice Caption Header */}
      <div style={{
        marginTop: '60px', /* Push down below toast */
        textAlign: 'center',
        height: '40px'
      }}>
        {state === 'listening' ? (
          <div style={{ color: '#00d9ff', fontWeight: 'bold', letterSpacing: '1px', animation: 'pulse-text 2s infinite' }}>
            LISTENING...
          </div>
        ) : state === 'speaking' ? (
          <div style={{ color: '#ff00ff', fontWeight: 'bold', letterSpacing: '1px' }}>
            FRIDAY SPEAKING...
          </div>
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

      {/* Conversation Overlay */}
      <div className="chat-overlay">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}`}>
            {msg.text}
          </div>
        ))}
      </div>

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
          <button onClick={handleSend} style={{ background: '#333', border: 'none', borderRadius: '12px', padding: '6px 12px', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            SEND
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`icon-btn ${micOn ? '' : 'active'}`} onClick={() => setMicOn(!micOn)} title="Toggle Microphone">
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
            <ChevronDown size={14} style={{ marginLeft: 4 }} />
          </button>

          <button className={`icon-btn ${cameraOn ? 'active' : ''}`} onClick={toggleCamera} title="Toggle Camera">
            {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            <ChevronDown size={14} style={{ marginLeft: 4 }} />
          </button>

          <button className={`icon-btn ${screenShareOn ? 'active' : ''}`} onClick={toggleScreenShare} title="Share Screen">
            <MonitorUp size={20} />
          </button>

          <button className={`icon-btn ${showMemory ? 'active' : ''}`} onClick={() => setShowMemory(!showMemory)} title="Access Memory Banks">
            <MessageSquare size={20} />
          </button>

          <button className="icon-btn danger" onClick={() => setConnected(false)} title="Disconnect">
            <PhoneOff size={20} style={{ marginRight: 8 }} />
            EXIT
          </button>
        </div>
      </div>
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
