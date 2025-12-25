'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Cpu, Volume2, MessageSquare, Shield } from 'lucide-react';

interface SettingsData {
    verbosity: string;
    humor: string;
    strictness: string;
    autonomy: string;
}

export function SettingsPanel() {
    const [settings, setSettings] = useState<SettingsData>({
        verbosity: 'concise',
        humor: 'low',
        strictness: 'high',
        autonomy: '2'
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
            const res = await fetch(`${backendUrl}/api/settings`);
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({ ...prev, ...data }));
            }
        } catch (e) {
            console.error("Failed to load settings", e);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        setStatus('saving');
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
            const res = await fetch(`${backendUrl}/api/settings`, {
                method: 'POST',
                body: JSON.stringify(settings),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                setStatus('saved');
                setTimeout(() => setStatus('idle'), 2000);
            } else {
                setStatus('error');
            }
        } catch (e) {
            setStatus('error');
        }
    };

    const handleChange = (key: keyof SettingsData, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setStatus('idle');
    };

    return (
        <div className="h-full w-full p-4 md:p-8 flex flex-col overflow-y-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Cpu className="text-blue-400" />
                    System Configuration
                </h1>
                <p className="text-gray-400 mt-2">Customize generic behavior, personality matrix, and autonomy protocols.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">

                {/* Personality Matrix */}
                <section className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <MessageSquare size={20} className="text-purple-400" />
                        Personality Matrix
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Verbosity</label>
                            <select
                                value={settings.verbosity}
                                onChange={(e) => handleChange('verbosity', e.target.value)}
                                className="w-full bg-black/60 border border-white/20 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                            >
                                <option value="concise">Concise (Efficiency Focus)</option>
                                <option value="balanced">Balanced (Natural)</option>
                                <option value="detailed">Detailed (Explanatory)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Humor Level</label>
                            <input
                                type="range" min="0" max="10" step="1" // Mapping "low", "high" might need parsing if string in DB
                                // Let's simplify: Use select for now to match string types in DB
                                className="hidden"
                            />
                            <div className="grid grid-cols-3 gap-2">
                                {['none', 'low', 'high', 'tars'].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => handleChange('humor', opt)}
                                        className={`p-2 rounded-lg text-sm border ${settings.humor === opt ? 'bg-blue-500/20 border-blue-500 text-blue-200' : 'bg-transparent border-white/10 text-gray-400 hover:bg-white/5'}`}
                                    >
                                        {opt.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Strictness / Tone</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['casual', 'neutral', 'high'].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => handleChange('strictness', opt)}
                                        className={`p-2 rounded-lg text-sm border ${settings.strictness === opt ? 'bg-red-500/20 border-red-500 text-red-200' : 'bg-transparent border-white/10 text-gray-400 hover:bg-white/5'}`}
                                    >
                                        {opt.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Autonomy Protocols */}
                <section className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Shield size={20} className="text-green-400" />
                        Autonomy Protocols
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">Autonomy Level (1-6)</label>
                            <div className="space-y-3">
                                {[
                                    { lvl: '1', desc: 'Respond Only' },
                                    { lvl: '2', desc: 'Suggest Actions' },
                                    { lvl: '3', desc: 'Auto-Plan' },
                                    { lvl: '4', desc: 'Execute Tools' },
                                    { lvl: '5', desc: 'Chain Execution' },
                                    { lvl: '6', desc: 'Self-Optimize' },
                                ].map((item) => (
                                    <button
                                        key={item.lvl}
                                        onClick={() => handleChange('autonomy', item.lvl)}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${settings.autonomy === item.lvl
                                                ? 'bg-green-500/20 border-green-500 text-green-100 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                                                : 'bg-transparent border-white/10 text-gray-500 hover:bg-white/5'
                                            }`}
                                    >
                                        <span className="font-mono font-bold">Lvl {item.lvl}</span>
                                        <span className="text-sm opacity-80">{item.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Footer / Actions */}
            <div className="mt-8 flex gap-4 max-w-5xl">
                <button
                    onClick={saveSettings}
                    disabled={loading || status === 'saving'}
                    className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {status === 'saving' ? <RefreshCw className="animate-spin" /> : <Save />}
                    {status === 'saved' ? 'Saved Successfully' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
}
