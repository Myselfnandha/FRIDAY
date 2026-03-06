import React, { useRef, useEffect, useState } from 'react'

const BAR_COUNT = 12

export default function VoiceVisualizer({ isActive = false, audioLevel = 0 }) {
    const canvasRef = useRef(null)
    const animFrameRef = useRef(null)
    const barsRef = useRef(Array(BAR_COUNT).fill(0))

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')

        const dpr = window.devicePixelRatio || 1
        const width = canvas.clientWidth * dpr
        const height = canvas.clientHeight * dpr
        canvas.width = width
        canvas.height = height
        ctx.scale(dpr, dpr)

        const draw = () => {
            const w = canvas.clientWidth
            const h = canvas.clientHeight
            ctx.clearRect(0, 0, w, h)

            const barWidth = 3
            const gap = 4
            const totalWidth = BAR_COUNT * (barWidth + gap) - gap
            const startX = (w - totalWidth) / 2

            for (let i = 0; i < BAR_COUNT; i++) {
                // Target height: either from audioLevel or idle state
                let target
                if (isActive) {
                    // Create wave pattern from center outward
                    const centerDist = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2)
                    const wave = Math.sin(Date.now() / 200 + i * 0.6) * 0.3 + 0.5
                    target = (audioLevel > 0 ? audioLevel : wave) * (1 - centerDist * 0.4)
                    target = Math.max(0.1, Math.min(1, target))
                } else {
                    target = 0.06
                }

                // Smooth interpolation
                barsRef.current[i] += (target - barsRef.current[i]) * 0.15
                const barHeight = barsRef.current[i] * h * 0.9

                const x = startX + i * (barWidth + gap)
                const y = (h - barHeight) / 2

                // Gradient color based on height
                const intensity = barsRef.current[i]
                const alpha = isActive ? 0.4 + intensity * 0.6 : 0.2
                ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`

                // Rounded bars
                const radius = barWidth / 2
                ctx.beginPath()
                ctx.moveTo(x + radius, y)
                ctx.lineTo(x + barWidth - radius, y)
                ctx.arcTo(x + barWidth, y, x + barWidth, y + radius, radius)
                ctx.lineTo(x + barWidth, y + barHeight - radius)
                ctx.arcTo(x + barWidth, y + barHeight, x + barWidth - radius, y + barHeight, radius)
                ctx.lineTo(x + radius, y + barHeight)
                ctx.arcTo(x, y + barHeight, x, y + barHeight - radius, radius)
                ctx.lineTo(x, y + radius)
                ctx.arcTo(x, y, x + radius, y, radius)
                ctx.fill()

                // Glow for active bars
                if (isActive && intensity > 0.3) {
                    ctx.shadowColor = 'rgba(0, 229, 255, 0.5)'
                    ctx.shadowBlur = 6
                    ctx.fill()
                    ctx.shadowBlur = 0
                }
            }

            animFrameRef.current = requestAnimationFrame(draw)
        }

        draw()

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        }
    }, [isActive, audioLevel])

    return (
        <div className="visualizer">
            <canvas
                ref={canvasRef}
                className="visualizer__canvas"
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    )
}
