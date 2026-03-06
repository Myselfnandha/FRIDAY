import { useRef, useState, useCallback, useEffect } from 'react'

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`

export default function useWebSocket() {
    const wsRef = useRef(null)
    const [connected, setConnected] = useState(false)
    const [status, setStatus] = useState('idle')
    const [messages, setMessages] = useState([])
    const [audioQueue, setAudioQueue] = useState([])
    const [services, setServices] = useState({})
    const [activity, setActivity] = useState('')
    const reconnectTimer = useRef(null)

    const handleMessage = useCallback((event) => {
        try {
            const data = JSON.parse(event.data)

            switch (data.type) {
                case 'response_text':
                    setMessages(prev => {
                        const last = prev[prev.length - 1]
                        if (last && last.role === 'assistant' && last._streaming) {
                            return [...prev.slice(0, -1), {
                                role: data.role,
                                content: data.content,
                                timestamp: Date.now(),
                            }]
                        }
                        return [...prev, {
                            role: data.role,
                            content: data.content,
                            timestamp: Date.now(),
                        }]
                    })
                    break
                case 'transcript':
                    setMessages(prev => [...prev, {
                        role: data.role,
                        content: data.content,
                        timestamp: Date.now(),
                    }])
                    break
                case 'response_chunk':
                    setMessages(prev => {
                        const last = prev[prev.length - 1]
                        if (last && last.role === 'assistant' && last._streaming) {
                            return [...prev.slice(0, -1), {
                                ...last,
                                content: last.content + data.content,
                            }]
                        }
                        return [...prev, {
                            role: 'assistant',
                            content: data.content,
                            timestamp: Date.now(),
                            _streaming: true,
                        }]
                    })
                    break
                case 'audio_response':
                    setAudioQueue(prev => [...prev, data.data])
                    break
                case 'status':
                    setStatus(data.state)
                    break
                case 'system_status':
                    setServices(prev => ({
                        ...prev,
                        [data.service]: data.state,
                    }))
                    if (data.message) setActivity(data.message)
                    break
                case 'error':
                    console.error('Server error:', data.message)
                    setActivity(`Error: ${data.message}`)
                    break
            }
        } catch (e) {
            console.error('WS message parse error:', e)
        }
    }, [])

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return

        const ws = new WebSocket(WS_URL)

        ws.onopen = () => {
            setConnected(true)
            setStatus('listening')
            setActivity('Connected to Friday')
        }

        ws.onmessage = handleMessage

        ws.onclose = () => {
            setConnected(false)
            setStatus('idle')
            setActivity('Disconnected — reconnecting...')
            reconnectTimer.current = setTimeout(connect, 3000)
        }

        ws.onerror = (err) => {
            console.error('WebSocket error:', err)
            setActivity('Connection error')
        }

        wsRef.current = ws
    }, [handleMessage])

    const disconnect = useCallback(() => {
        clearTimeout(reconnectTimer.current)
        if (wsRef.current) {
            wsRef.current.close()
            wsRef.current = null
        }
        setConnected(false)
        setStatus('idle')
        setMessages([])
        setServices({})
        setActivity('')
    }, [])

    const sendText = useCallback((text) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'text_message', content: text }))
        }
    }, [])

    const sendAudio = useCallback((base64Audio) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'audio_chunk', data: base64Audio }))
        }
    }, [])

    const sendVisionFrame = useCallback((base64Image, prompt = '') => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'vision_frame', data: base64Image, prompt }))
        }
    }, [])

    const endSession = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'end_session' }))
        }
        disconnect()
    }, [disconnect])

    useEffect(() => {
        return () => {
            clearTimeout(reconnectTimer.current)
            wsRef.current?.close()
        }
    }, [])

    return {
        connected,
        status,
        messages,
        audioQueue,
        setAudioQueue,
        services,
        activity,
        connect,
        disconnect,
        sendText,
        sendAudio,
        sendVisionFrame,
        endSession,
    }
}
