import React, { useRef, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

function timeAgo(date) {
    const seconds = Math.floor((Date.now() - date) / 1000)
    if (seconds < 10) return 'just now'
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
}

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            navigator.vibrate?.(10)
            setTimeout(() => setCopied(false), 2000)
        } catch { /* fallback */ }
    }
    return (
        <button className="chat__copy" onClick={handleCopy} title="Copy">
            {copied ? '✓ Copied' : 'Copy'}
        </button>
    )
}

function TypingIndicator() {
    return (
        <div className="chat__message chat__message--assistant">
            <span className="chat__label">Friday</span>
            <div className="chat__bubble chat__typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
            </div>
        </div>
    )
}

const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '')
        if (!inline && match) {
            return (
                <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                        margin: '8px 0',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                    }}
                    {...props}
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            )
        }
        return <code className="chat__inline-code" {...props}>{children}</code>
    },
}

export default function ChatPanel({ messages, isThinking }) {
    const endRef = useRef(null)

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isThinking])

    return (
        <div className="chat">
            {messages && messages.map((msg, i) => (
                <div key={i} className={`chat__message chat__message--${msg.role}`}>
                    <div className="chat__meta">
                        <span className="chat__label">
                            {msg.role === 'user' ? 'You' : 'Friday'}
                        </span>
                        {msg.timestamp && (
                            <span className="chat__time">{timeAgo(msg.timestamp)}</span>
                        )}
                    </div>
                    <div className="chat__bubble">
                        {msg.role === 'assistant' ? (
                            <ReactMarkdown components={markdownComponents}>
                                {msg.content}
                            </ReactMarkdown>
                        ) : (
                            msg.content
                        )}
                    </div>
                    {msg.role === 'assistant' && !msg._streaming && (
                        <CopyButton text={msg.content} />
                    )}
                </div>
            ))}
            {isThinking && <TypingIndicator />}
            <div ref={endRef} />
        </div>
    )
}
