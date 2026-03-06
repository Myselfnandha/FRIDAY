import React, { useState, useCallback } from 'react'
import HudBackground from '../components/HudBackground'
import ArcReactor from '../components/ArcReactor'
import VoiceVisualizer from '../components/VoiceVisualizer'
import ChatPanel from '../components/ChatPanel'
import ControlBar from '../components/ControlBar'
import MessageInput from '../components/MessageInput'
import VideoFeed from '../components/VideoFeed'
import StatusBar from '../components/StatusBar'
import DeviceSelector from '../components/DeviceSelector'
import useWebSocket from '../hooks/useWebSocket'
import useVoice from '../hooks/useVoice'
import useCamera from '../hooks/useCamera'
import useAudioPlayer from '../hooks/useAudioPlayer'

export default function AssistantScreen({ onEnd }) {
    const {
        connected,
        status,
        messages,
        audioQueue,
        setAudioQueue,
        services,
        activity,
        connect,
        sendText,
        sendAudio,
        sendVisionFrame,
        endSession,
    } = useWebSocket()

    const [chatVisible, setChatVisible] = useState(true)
    const [screenActive, setScreenActive] = useState(false)
    const [deviceSelectorType, setDeviceSelectorType] = useState(null) // 'audioinput' | 'videoinput' | null
    const [audioDeviceId, setAudioDeviceId] = useState(
        () => localStorage.getItem('friday_audioinput') || ''
    )
    const [videoDeviceId, setVideoDeviceId] = useState(
        () => localStorage.getItem('friday_videoinput') || ''
    )

    const { recording, toggleRecording } = useVoice(sendAudio)
    const { active: cameraActive, stream: cameraStream, startCamera, stopCamera, switchCamera, startScreenShare, captureFrame } = useCamera()

    useAudioPlayer(audioQueue, setAudioQueue)

    // Interrupt audio when new response starts streaming
    React.useEffect(() => {
        if (status === 'thinking') {
            window.__fridayAudioInterrupt?.()
            setAudioQueue([])
        }
    }, [status, setAudioQueue])

    React.useEffect(() => {
        connect()
        return () => endSession()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const handleSendText = useCallback((text) => {
        sendText(text)
    }, [sendText])

    const handleToggleMic = useCallback(() => {
        toggleRecording(audioDeviceId)
    }, [toggleRecording, audioDeviceId])

    const handleToggleCamera = useCallback(async () => {
        if (cameraActive) {
            stopCamera()
        } else {
            const s = await startCamera(videoDeviceId)
            if (s) {
                setTimeout(async () => {
                    const frame = await captureFrame()
                    if (frame) sendVisionFrame(frame, 'What do you see?')
                }, 1000)
            }
        }
    }, [cameraActive, startCamera, stopCamera, captureFrame, sendVisionFrame, videoDeviceId])

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
                    if (frame) sendVisionFrame(frame, 'Describe what you see on screen.')
                }, 1000)
            }
        }
    }, [screenActive, startScreenShare, stopCamera, captureFrame, sendVisionFrame])

    const handleEndCall = useCallback(() => {
        endSession()
        onEnd?.()
    }, [endSession, onEnd])

    const handleToggleSettings = useCallback(() => {
        // Cycle: null -> audioinput -> videoinput -> null
        setDeviceSelectorType(prev => {
            if (!prev) return 'audioinput'
            if (prev === 'audioinput') return 'videoinput'
            return null
        })
    }, [])

    const handleDeviceSelect = useCallback((deviceId) => {
        if (deviceSelectorType === 'audioinput') {
            setAudioDeviceId(deviceId)
        } else if (deviceSelectorType === 'videoinput') {
            setVideoDeviceId(deviceId)
            if (cameraActive) {
                switchCamera(deviceId)
            }
        }
    }, [deviceSelectorType, cameraActive, switchCamera])

    const isActive = status === 'speaking' || status === 'thinking' || recording
    const isThinking = status === 'thinking'

    return (
        <div className="assistant">
            <HudBackground />
            <StatusBar services={services} activity={activity} connected={connected} />

            <div className="assistant__center">
                <VoiceVisualizer isActive={isActive} />

                {!chatVisible && <ArcReactor size="large" />}

                {chatVisible ? (
                    <ChatPanel messages={messages} isThinking={isThinking} />
                ) : (
                    <p className="assistant__status">
                        {connected ? (isThinking ? 'Thinking...' : 'Listening') : 'Connecting...'}
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
                onToggleMic={handleToggleMic}
                onToggleCamera={handleToggleCamera}
                onToggleScreen={handleToggleScreen}
                onToggleChat={() => setChatVisible(!chatVisible)}
                onToggleSettings={handleToggleSettings}
                onEndCall={handleEndCall}
            />

            <DeviceSelector
                type={deviceSelectorType}
                isOpen={!!deviceSelectorType}
                onSelect={handleDeviceSelect}
                onClose={() => setDeviceSelectorType(null)}
            />
        </div>
    )
}
