import { useRef, useState, useCallback } from 'react'

export default function useCamera() {
    const [active, setActive] = useState(false)
    const [stream, setStream] = useState(null)
    const [facingMode, setFacingMode] = useState('user')

    const startCamera = useCallback(async (deviceId) => {
        try {
            const constraints = { video: { width: 640, height: 480 } }

            if (deviceId) {
                constraints.video.deviceId = { exact: deviceId }
            } else {
                constraints.video.facingMode = facingMode
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
            setStream(mediaStream)
            setActive(true)
            navigator.vibrate?.(10)
            return mediaStream
        } catch (err) {
            console.error('Camera access error:', err)
            return null
        }
    }, [facingMode])

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop())
            setStream(null)
        }
        setActive(false)
    }, [stream])

    const switchCamera = useCallback(async (deviceId) => {
        // Stop current stream first
        if (stream) {
            stream.getTracks().forEach(t => t.stop())
        }

        if (deviceId) {
            return startCamera(deviceId)
        }

        // Toggle front/back
        const newMode = facingMode === 'user' ? 'environment' : 'user'
        setFacingMode(newMode)
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: newMode },
            })
            setStream(mediaStream)
            setActive(true)
            navigator.vibrate?.(10)
            return mediaStream
        } catch (err) {
            console.error('Camera switch error:', err)
            return null
        }
    }, [stream, facingMode, startCamera])

    const startScreenShare = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
            })
            setStream(mediaStream)
            setActive(true)

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
        facingMode,
        startCamera,
        stopCamera,
        switchCamera,
        startScreenShare,
        captureFrame,
    }
}
