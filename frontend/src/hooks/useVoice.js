import { useRef, useState, useCallback } from 'react'

export default function useVoice(onAudioReady) {
    const [recording, setRecording] = useState(false)
    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])
    const silenceTimerRef = useRef(null)
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

            // Voice Activity Detection via AnalyserNode
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            const source = audioCtx.createMediaStreamSource(stream)
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 512
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

            // VAD: auto-stop after 2s of silence
            let silentFrames = 0
            const dataArray = new Uint8Array(analyser.frequencyBinCount)
            silenceTimerRef.current = setInterval(() => {
                analyser.getByteFrequencyData(dataArray)
                const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length
                if (avg < 10) {
                    silentFrames++
                    if (silentFrames > 20) { // ~2s at 100ms intervals
                        stopRecording()
                    }
                } else {
                    silentFrames = 0
                }
            }, 100)
        } catch (err) {
            console.error('Mic access error:', err)
        }
    }, [onAudioReady])

    const stopRecording = useCallback(() => {
        clearInterval(silenceTimerRef.current)
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop()
            setRecording(false)
        }
    }, [])

    const toggleRecording = useCallback((deviceId) => {
        if (recording) {
            stopRecording()
        } else {
            startRecording(deviceId)
        }
    }, [recording, startRecording, stopRecording])

    return { recording, startRecording, stopRecording, toggleRecording }
}
