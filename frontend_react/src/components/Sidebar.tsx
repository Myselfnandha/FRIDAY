'use client';

import React from 'react';
import { Home, Bot, Code, Terminal, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
    const menuItems = [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'assistant', icon: Bot, label: 'ALAN AI' },
        { id: 'projects', icon: Code, label: 'Projects' },
        { id: 'about', icon: User, label: 'About' },
    ];

    return (
        <div className="h-full w-20 md:w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col items-center md:items-start py-8 z-50">
            <div className="mb-12 px-0 md:px-8 w-full flex justify-center md:justify-start">
                <div className="h-10 w-10 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-white tracking-widest cursor-pointer shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                    A
                </div>
                <span className="hidden md:block ml-4 text-xl font-bold tracking-wider text-white">ALAN</span>
            </div>

            <nav className="flex-1 w-full flex flex-col gap-4 px-4">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 w-full group relative overflow-hidden ${activeTab === item.id
                            ? 'bg-white/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <item.icon className="w-6 h-6 z-10" />
                        <span className="hidden md:block font-medium z-10">{item.label}</span>
                        {activeTab === item.id && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-white/5"
                                initial={false}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                    </button>
                ))}
            </nav>

            <div className="p-4 w-full">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-900 to-black border border-white/5 text-xs text-gray-500">
                    <Terminal size={14} />
                    <span className="hidden md:block">v2.1.0-beta</span>
                </div>
            </div>
        </div>
    );
}
