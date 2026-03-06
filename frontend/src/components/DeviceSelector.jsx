import React, { useState, useEffect } from 'react'

export default function DeviceSelector({ type, onSelect, isOpen, onClose }) {
    const [devices, setDevices] = useState([])
    const [selected, setSelected] = useState('')

    useEffect(() => {
        if (!isOpen) return

        async function loadDevices() {
            try {
                const allDevices = await navigator.mediaDevices.enumerateDevices()
                const filtered = allDevices.filter(d => d.kind === type)
                setDevices(filtered)

                const saved = localStorage.getItem(`friday_${type}`)
                if (saved && filtered.some(d => d.deviceId === saved)) {
                    setSelected(saved)
                } else if (filtered.length > 0) {
                    setSelected(filtered[0].deviceId)
                }
            } catch (err) {
                console.error('Device enumeration error:', err)
            }
        }

        loadDevices()
    }, [isOpen, type])

    const handleSelect = (deviceId) => {
        setSelected(deviceId)
        localStorage.setItem(`friday_${type}`, deviceId)
        onSelect(deviceId)
        onClose()
        navigator.vibrate?.(10)
    }

    if (!isOpen || devices.length === 0) return null

    const label = type === 'audioinput' ? 'Audio Source' : 'Camera Source'

    return (
        <div className="device-selector__overlay" onClick={onClose}>
            <div className="device-selector" onClick={e => e.stopPropagation()}>
                <div className="device-selector__header">{label}</div>
                <div className="device-selector__list">
                    {devices.map((device, i) => {
                        const name = device.label || `${type === 'audioinput' ? 'Mic' : 'Camera'} ${i + 1}`
                        const isActive = device.deviceId === selected
                        return (
                            <button
                                key={device.deviceId || i}
                                className={`device-selector__item ${isActive ? 'device-selector__item--active' : ''}`}
                                onClick={() => handleSelect(device.deviceId)}
                            >
                                <span className="device-selector__dot" />
                                <span>{name}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
