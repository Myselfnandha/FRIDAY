import { useRef, useState, useCallback } from 'react'

export default function useVoice(onAudioReady) {
    const [recording, setRecording] = useState(false)
    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
            })

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
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                const arrayBuffer = await blob.arrayBuffer()
                const base64 = btoa(
                    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                )
                onAudioReady?.(base64)

                // Stop all tracks
                stream.getTracks().forEach(t => t.stop())
            }

            mediaRecorderRef.current = mediaRecorder
            mediaRecorder.start()
            setRecording(true)
        } catch (err) {
            console.error('Mic access error:', err)
        }
    }, [onAudioReady])

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop()
            setRecording(false)
        }
    }, [])

    const toggleRecording = useCallback(() => {
        if (recording) {
            stopRecording()
        } else {
            startRecording()
        }
    }, [recording, startRecording, stopRecording])

    return { recording, startRecording, stopRecording, toggleRecording }
}
