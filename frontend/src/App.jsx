import { useState, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useVoiceAssistant,
} from '@livekit/components-react';
import { Mic, MicOff, Video, VideoOff, MessageSquare, MonitorUp, PhoneOff, Send, ChevronDown } from 'lucide-react';
import './index.css';

export default function App() {
  const [token, setToken] = useState("");
  const [url, setUrl] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Auto-fetch token from backend
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/token');
        const data = await response.json();
        if (data.token && data.url) {
          setToken(data.token);
          setUrl(data.url);
        }
      } catch (e) {
        console.error("Failed to fetch token:", e);
      }
    };
    fetchToken();
  }, []);

  return (
    <div className="sci-fi-bg">
      {/* Background Animated Lines */}
      {[...Array(10)].map((_, i) => (
        <div key={i} className="vertical-line" style={{ left: `${i * 10 + 5}%`, animationDelay: `${i * 0.5}s`, height: `${Math.random() * 100 + 50}px` }}></div>
      ))}

      {!connected ? (
        <ConnectScreen setConnected={setConnected} token={token} setToken={setToken} url={url} setUrl={setUrl} />
      ) : (
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

function ConnectScreen({ setConnected, token, setToken, url, setUrl }) {
  const [backendUrl, setBackendUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFetchToken = async () => {
    setLoading(true);
    setError("");
    let targetUrl = backendUrl.trim();

    try {
      // 1. Smart Conversion for Hugging Face Spaces
      // Converts "https://huggingface.co/spaces/user/space" -> "https://user-space.hf.space"
      const hfRegex = /huggingface\.co\/spaces\/([^\/]+)\/([^\/]+)/;
      const match = targetUrl.match(hfRegex);
      if (match) {
        targetUrl = `https://${match[1]}-${match[2]}.hf.space`;
        console.log("Auto-converted HF URL to:", targetUrl);
      }

      // 2. Protocol Check
      if (!targetUrl.startsWith('http')) {
        targetUrl = 'https://' + targetUrl;
      }
      targetUrl = targetUrl.replace(/\/$/, ""); // Remove trailing slash

      console.log("Attempting to fetch from:", `${targetUrl}/api/token`);

      // 3. Fetch
      const response = await fetch(`${targetUrl}/api/token`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Backend not found (404). Check the URL.");
        }
        if (response.status === 502 || response.status === 503) {
            throw new Error("Backend is waking up (502/503). Try again in 30s.");
        }
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      if (data.token && data.url) {
        setToken(data.token);
        setUrl(data.url);
        setError(""); // Clear error on success
      } else {
        throw new Error("Invalid response format from server.");
      }
    } catch (e) {
      console.error("Fetch Token Error:", e);
      setError(`Error: ${e.message}. Is the Backend running?`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="connect-container">
      <div className="reactor-container" style={{ transform: 'scale(0.8)' }}>
        <div className="reactor-ring outer"></div>
        <div className="reactor-ring inner"></div>
        <div className="reactor-ticks"></div>
        <div className="reactor-core"></div>
        <div style={{ position: 'absolute', zIndex: 2, textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: '#00d9ff', borderRadius: '50%', boxShadow: '0 0 40px #00d9ff', opacity: 0.8, margin: '0 auto' }}></div>
        </div>
      </div>

      <h2 style={{ marginTop: '2rem', fontSize: '1.2rem', color: '#fff', fontWeight: 400 }}>
        Chat live with F.R.I.D.A.Y
      </h2>

      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px', width: '320px', zIndex: 10 }}>
        
        {/* Backend URL Input */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
            <label style={{fontSize: '0.8rem', color: '#ccc', marginLeft: '4px'}}>Backend URL (Hugging Face / Localhost)</label>
            <div style={{display: 'flex', gap: '5px'}}>
                <input
                value={backendUrl}
                onChange={e => setBackendUrl(e.target.value)}
                placeholder="https://huggingface.co/spaces/..."
                style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px' }}
                />
                <button 
                    onClick={handleFetchToken} 
                    className="icon-btn" 
                    style={{ borderRadius: '8px', width: 'auto', padding: '0 15px', opacity: loading ? 0.5 : 1, background: loading ? '#555' : '#00d9ff', color: loading ? '#ccc' : '#000' }}
                    disabled={loading}
                >
                    {loading ? '...' : 'CONNECT'}
                </button>
            </div>
        </div>

        {error && (
            <div style={{
                color: '#ffaaaa', 
                fontSize: '0.8rem', 
                textAlign: 'center', 
                background: 'rgba(255,0,0,0.1)', 
                padding: '8px', 
                borderRadius: '4px',
                border: '1px solid rgba(255,0,0,0.2)'
            }}>
                {error}
            </div>
        )}

        {token && (
            <div style={{color: '#00ff9d', fontSize: '0.8rem', textAlign: 'center'}}>
                ✓ Connected to Backend. Ready to Initialize.
            </div>
        )}

        <div style={{display: 'flex', gap: '5px'}}>
            <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="LiveKit URL (wss://...)"
            style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px', fontSize: '0.8rem' }}
            />
        </div>
        
        <div style={{display: 'flex', gap: '5px'}}>
            <input
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Access Token (ey...)"
            style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid #333', padding: '10px', color: 'white', borderRadius: '8px', fontSize: '0.8rem' }}
            />
        </div>

      </div>

      <button 
        className="connect-btn" 
        onClick={() => setConnected(true)}
        disabled={!token || !url}
        style={{ marginTop: '20px', opacity: (!token || !url) ? 0.5 : 1, cursor: (!token || !url) ? 'not-allowed' : 'pointer' }}
      >
        INITIALIZE SYSTEM
      </button>
    </div>
  )
}

function FridayInterface({ setConnected }) {
  const { state, audioTrack } = useVoiceAssistant();
  const [inputText, setInputText] = useState("");
  const [micOn, setMicOn] = useState(true);
  const { localParticipant } = useLocalParticipant();

  // Fake conversation history for visual demo (Reference Image 2)
  // In a real app, you'd pull this from the agent events
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Systems online. Alan is ready to serve." },
  ]);

  // Effect to toggle mic (using LiveKit hooks)
  useEffect(() => {
    localParticipant.setMicrophoneEnabled(micOn);
  }, [micOn, localParticipant]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: inputText }]);
    setInputText("");
    // Here you would also send the text to the agent via data channel if supported
    // agent.chat(inputText)
  };

  return (
    <div className="friday-ui-container">
      {/* Top Status */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '5px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ width: '8px', height: '8px', background: '#ccc', borderRadius: '50%', opacity: 0.5 }}></div>
        ))}
      </div>

      {/* Main Visualizer Area */}
      <div className="reactor-container">
        <div className="reactor-ring outer"></div>
        <div className="reactor-ring inner"></div>
        <div className="reactor-ticks"></div>

        {/* Core reacts to "talking" state */}
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
        {state === 'listening' && (
          <p style={{ color: '#8b9bb4', fontSize: '0.9rem', marginTop: '20px' }}>
            FRIDAY is listening, ask her a question
          </p>
        )}
      </div>

      {/* Dropdown / Spacer */}
      <div style={{ flex: 1 }}></div>

      {/* Bottom Control Bar */}
      <div className="control-bar">
        {/* Input Field */}
        <div className="input-group">
          <input
            className="input-field"
            placeholder="Type something..."
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
          <button className={`icon-btn ${micOn ? '' : 'active'}`} onClick={() => setMicOn(!micOn)}>
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
            <ChevronDown size={14} style={{ marginLeft: 4 }} />
          </button>

          <button className="icon-btn">
            <VideoOff size={20} />
            <ChevronDown size={14} style={{ marginLeft: 4 }} />
          </button>

          <button className="icon-btn">
            <MonitorUp size={20} />
          </button>

          <button className="icon-btn active">
            <MessageSquare size={20} />
          </button>

          <button className="icon-btn danger" onClick={() => setConnected(false)}>
            <PhoneOff size={20} style={{ marginRight: 8 }} />
            END CALL
          </button>
        </div>
      </div>
    </div>
  )
}
