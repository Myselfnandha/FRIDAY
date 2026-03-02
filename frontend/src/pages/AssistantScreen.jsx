import React, { useState, useCallback } from 'react'
import HudBackground from '../components/HudBackground'
import ArcReactor from '../components/ArcReactor'
import VoiceVisualizer from '../components/VoiceVisualizer'
import ChatPanel from '../components/ChatPanel'
import ControlBar from '../components/ControlBar'
import MessageInput from '../components/MessageInput'
import VideoFeed from '../components/VideoFeed'
import useWebSocket from '../hooks/useWebSocket'
import useVoice from '../hooks/useVoice'
import useCamera from '../hooks/useCamera'
import useAudioPlayer from '../hooks/useAudioPlayer'

const STATUS_LABELS = {
    idle: '',
    listening: 'FRIDAY is listening, ask her a question',
    thinking: 'FRIDAY is thinking...',
    speaking: 'FRIDAY is speaking...',
    transcribing: 'Processing your voice...',
    analyzing: 'Analyzing what you shared...',
}

export default function AssistantScreen({ onEnd }) {
    const {
        connected,
        status,
        messages,
        audioQueue,
        setAudioQueue,
        connect,
        sendText,
        sendAudio,
        sendVisionFrame,
        endSession,
    } = useWebSocket()

    const [chatVisible, setChatVisible] = useState(true)
    const [screenActive, setScreenActive] = useState(false)

    const { recording, toggleRecording } = useVoice(sendAudio)
    const { active: cameraActive, stream: cameraStream, startCamera, stopCamera, startScreenShare, captureFrame } = useCamera()

    useAudioPlayer(audioQueue, setAudioQueue)

    // Auto-connect on mount
    React.useEffect(() => {
        connect()
        return () => endSession()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const handleSendText = useCallback((text) => {
        sendText(text)
    }, [sendText])

    const handleToggleCamera = useCallback(async () => {
        if (cameraActive) {
            stopCamera()
        } else {
            const s = await startCamera()
            if (s) {
                // Capture a frame after a short delay for vision
                setTimeout(async () => {
                    const frame = await captureFrame()
                    if (frame) {
                        sendVisionFrame(frame, 'What do you see?')
                    }
                }, 1000)
            }
        }
    }, [cameraActive, startCamera, stopCamera, captureFrame, sendVisionFrame])

    const handleToggleScreen = useCallback(async () => {
        if (screenActive) {
            stopCamera()
            setScreenActive(false)
        } else {
            const s = await startScreenShare()
            if (s) {
                setScreenActive(true)
                setTimeout(async () => {
                    const frame = await captureFrame()
                    if (frame) {
                        sendVisionFrame(frame, 'Describe what you see on screen.')
                    }
                }, 1000)
            }
        }
    }, [screenActive, startScreenShare, stopCamera, captureFrame, sendVisionFrame])

    const handleEndCall = useCallback(() => {
        endSession()
        onEnd?.()
    }, [endSession, onEnd])

    const isActive = status === 'speaking' || status === 'thinking' || recording

    return (
        <div className="assistant">
            <HudBackground />

            <div className="assistant__center">
                <VoiceVisualizer isActive={isActive} />

                {!chatVisible && <ArcReactor size="large" />}

                {chatVisible ? (
                    <ChatPanel messages={messages} />
                ) : (
                    <p className="assistant__status">
                        {STATUS_LABELS[status] || (connected ? 'Connected' : 'Connecting...')}
                    </p>
                )}

                <VideoFeed stream={cameraStream} />
            </div>

            <MessageInput onSend={handleSendText} disabled={!connected} />

            <ControlBar
                micActive={recording}
                cameraActive={cameraActive}
                screenActive={screenActive}
                chatActive={chatVisible}
                onToggleMic={toggleRecording}
                onToggleCamera={handleToggleCamera}
                onToggleScreen={handleToggleScreen}
                onToggleChat={() => setChatVisible(!chatVisible)}
                onEndCall={handleEndCall}
            />
        </div>
    )
}
