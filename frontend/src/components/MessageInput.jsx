import React, { useState, useRef, useEffect } from 'react'

export default function MessageInput({ onSend, disabled }) {
    const [text, setText] = useState('')
    const textareaRef = useRef(null)

    const handleSend = () => {
        const trimmed = text.trim()
        if (!trimmed || disabled) return
        onSend(trimmed)
        setText('')
        // Reset height after send
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Auto-grow textarea
    useEffect(() => {
        const el = textareaRef.current
        if (el) {
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 120) + 'px'
        }
    }, [text])

    return (
        <div className="input-bar">
            <textarea
                ref={textareaRef}
                className="input-bar__field"
                rows={1}
                placeholder="Message Friday..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                enterKeyHint="send"
                autoCapitalize="sentences"
                autoComplete="off"
            />
            <button
                className={`input-bar__send ${text.trim() ? 'input-bar__send--ready' : ''}`}
                onClick={handleSend}
                disabled={disabled || !text.trim()}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                </svg>
            </button>
        </div>
    )
}
