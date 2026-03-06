import { useRef, useState, useCallback } from 'react'

export default function useVoice(onAudioReady) {
    const [recording, setRecording] = useState(false)
    const [audioLevel, setAudioLevel] = useState(0)
    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])
    const silenceTimerRef = useRef(null)
    const levelTimerRef = useRef(null)
    const analyserRef = useRef(null)
    const audioCtxRef = useRef(null)

    const startRecording = useCallback(async (deviceId) => {
        try {
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                },
            }
            if (deviceId) {
                constraints.audio.deviceId = { exact: deviceId }
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            navigator.vibrate?.(15)

            // Audio analysis for VAD + visualizer
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            const source = audioCtx.createMediaStreamSource(stream)
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 256
            source.connect(analyser)
            audioCtxRef.current = audioCtx
            analyserRef.current = analyser

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm',
            })

            chunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            mediaRecorder.onstop = async () => {
                clearInterval(silenceTimerRef.current)
                clearInterval(levelTimerRef.current)
                setAudioLevel(0)
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                const arrayBuffer = await blob.arrayBuffer()
                const base64 = btoa(
                    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                )
                onAudioReady?.(base64)
                stream.getTracks().forEach(t => t.stop())
                audioCtx.close().catch(() => { })
                navigator.vibrate?.(10)
            }

            mediaRecorderRef.current = mediaRecorder
            mediaRecorder.start()
            setRecording(true)

            // Audio level monitoring for visualizer
            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            let silentFrames = 0

            const monitor = () => {
                analyser.getByteFrequencyData(dataArray)
                const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length
                const normalized = Math.min(1, avg / 128)
                setAudioLevel(normalized)

                // VAD: auto-stop after 2s of silence
                if (avg < 10) {
                    silentFrames++
                    if (silentFrames > 20) stopRecording()
                } else {
                    silentFrames = 0
                }
            }

            levelTimerRef.current = setInterval(monitor, 80)
        } catch (err) {
            console.error('Mic access error:', err)
        }
    }, [onAudioReady])

    const stopRecording = useCallback(() => {
        clearInterval(silenceTimerRef.current)
        clearInterval(levelTimerRef.current)
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop()
            setRecording(false)
        }
        setAudioLevel(0)
    }, [])

    const toggleRecording = useCallback((deviceId) => {
        if (recording) {
            stopRecording()
        } else {
            startRecording(deviceId)
        }
    }, [recording, startRecording, stopRecording])

    return { recording, audioLevel, startRecording, stopRecording, toggleRecording }
}
