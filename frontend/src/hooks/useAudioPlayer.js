import { useRef, useCallback, useEffect } from 'react'

export default function useAudioPlayer(audioQueue, setAudioQueue) {
    const playingRef = useRef(false)
    const currentAudioRef = useRef(null)

    // Interrupt: stop current audio and flush queue
    const interrupt = useCallback(() => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause()
            currentAudioRef.current = null
        }
        playingRef.current = false
    }, [])

    const playNext = useCallback(async () => {
        if (playingRef.current || !audioQueue || audioQueue.length === 0) return

        playingRef.current = true
        const base64Audio = audioQueue[0]

        try {
            const binaryString = atob(base64Audio)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i)
            }

            const blob = new Blob([bytes], { type: 'audio/mp3' })
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            currentAudioRef.current = audio

            audio.onended = () => {
                URL.revokeObjectURL(url)
                playingRef.current = false
                currentAudioRef.current = null
                setAudioQueue(prev => prev.slice(1))
            }

            audio.onerror = () => {
                URL.revokeObjectURL(url)
                playingRef.current = false
                currentAudioRef.current = null
                setAudioQueue(prev => prev.slice(1))
            }

            await audio.play()
        } catch (e) {
            console.error('Audio playback error:', e)
            playingRef.current = false
            currentAudioRef.current = null
            setAudioQueue(prev => prev.slice(1))
        }
    }, [audioQueue, setAudioQueue])

    useEffect(() => {
        if (audioQueue && audioQueue.length > 0 && !playingRef.current) {
            playNext()
        }
    }, [audioQueue, playNext])

    // Expose interrupt for external use
    useEffect(() => {
        window.__fridayAudioInterrupt = interrupt
        return () => { delete window.__fridayAudioInterrupt }
    }, [interrupt])
}
