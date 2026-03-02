import { useRef, useState, useCallback } from 'react'

export default function useCamera() {
    const [active, setActive] = useState(false)
    const [stream, setStream] = useState(null)
    const videoRef = useRef(null)

    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
            })
            setStream(mediaStream)
            setActive(true)
            return mediaStream
        } catch (err) {
            console.error('Camera access error:', err)
            return null
        }
    }, [])

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop())
            setStream(null)
        }
        setActive(false)
    }, [stream])

    const startScreenShare = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
            })
            setStream(mediaStream)
            setActive(true)

            // Handle user stopping screen share via browser UI
            mediaStream.getVideoTracks()[0].onended = () => {
                setStream(null)
                setActive(false)
            }

            return mediaStream
        } catch (err) {
            console.error('Screen share error:', err)
            return null
        }
    }, [])

    const captureFrame = useCallback(() => {
        if (!stream) return null

        const video = document.createElement('video')
        video.srcObject = stream
        video.play()

        return new Promise((resolve) => {
            video.onloadeddata = () => {
                const canvas = document.createElement('canvas')
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                const ctx = canvas.getContext('2d')
                ctx.drawImage(video, 0, 0)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
                const base64 = dataUrl.split(',')[1]
                video.pause()
                video.srcObject = null
                resolve(base64)
            }
        })
    }, [stream])

    return {
        active,
        stream,
        startCamera,
        stopCamera,
        startScreenShare,
        captureFrame,
    }
}
