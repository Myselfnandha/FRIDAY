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
        const response = await fetch('http://localhost:5000/token');
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
        Chat live with F.R.I.D.A.Y, your voice AI agent.
      </h2>

      {/* Inputs for Dev (Hidden in final look but needed for functionality) */}
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="LiveKit URL"
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '10px', color: 'white', borderRadius: '8px' }}
        />
        <input
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Access Token"
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '10px', color: 'white', borderRadius: '8px' }}
        />
      </div>

      <button className="connect-btn" onClick={() => setConnected(true)}>
        TALK TO F.R.I.D.A.Y
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
