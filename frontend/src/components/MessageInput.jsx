import React, { useState } from 'react'

export default function MessageInput({ onSend, disabled }) {
    const [text, setText] = useState('')

    const handleSend = () => {
        const trimmed = text.trim()
        if (!trimmed || disabled) return
        onSend(trimmed)
        setText('')
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="input-bar">
            <input
                className="input-bar__field"
                type="text"
                placeholder="Type something..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
            />
            <button
                className="input-bar__send"
                onClick={handleSend}
                disabled={disabled || !text.trim()}
            >
                SEND
            </button>
        </div>
    )
}
