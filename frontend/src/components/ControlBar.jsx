import React from 'react'

// Simple SVG icons to avoid emoji usage
const MicIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
)

const VideoIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
        <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
)

const ScreenIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" x2="16" y1="21" y2="21" />
        <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
)

const ChatIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
)

const PhoneOffIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
        <line x1="23" x2="1" y1="1" y2="23" />
    </svg>
)

export default function ControlBar({
    micActive,
    cameraActive,
    screenActive,
    chatActive,
    onToggleMic,
    onToggleCamera,
    onToggleScreen,
    onToggleChat,
    onEndCall,
}) {
    return (
        <div className="controls">
            <button
                className={`controls__btn ${micActive ? 'controls__btn--active' : ''}`}
                onClick={onToggleMic}
                title="Toggle microphone"
            >
                <MicIcon />
            </button>

            <button
                className={`controls__btn ${cameraActive ? 'controls__btn--active' : ''}`}
                onClick={onToggleCamera}
                title="Toggle camera"
            >
                <VideoIcon />
            </button>

            <button
                className={`controls__btn ${screenActive ? 'controls__btn--active' : ''}`}
                onClick={onToggleScreen}
                title="Share screen"
            >
                <ScreenIcon />
            </button>

            <button
                className={`controls__btn ${chatActive ? 'controls__btn--active' : ''}`}
                onClick={onToggleChat}
                title="Toggle chat"
            >
                <ChatIcon />
            </button>

            <button className="controls__end-btn" onClick={onEndCall} title="End session">
                <PhoneOffIcon />
                <span>END CALL</span>
            </button>
        </div>
    )
}
