import React, { useRef, useEffect } from 'react'

export default function ChatPanel({ messages }) {
    const endRef = useRef(null)

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    if (!messages || messages.length === 0) return null

    return (
        <div className="chat">
            {messages.map((msg, i) => (
                <div key={i} className={`chat__message chat__message--${msg.role}`}>
                    <span className="chat__label">
                        {msg.role === 'user' ? 'You' : 'Friday'}
                    </span>
                    <div className="chat__bubble">{msg.content}</div>
                </div>
            ))}
            <div ref={endRef} />
        </div>
    )
}
