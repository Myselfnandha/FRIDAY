import React, { useRef, useEffect } from 'react'

export default function VideoFeed({ stream }) {
    const videoRef = useRef(null)

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    if (!stream) return null

    return (
        <div className="video-feed">
            <video ref={videoRef} autoPlay muted playsInline />
        </div>
    )
}
