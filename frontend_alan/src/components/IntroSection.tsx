'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Github, Twitter, Linkedin } from 'lucide-react';

interface IntroSectionProps {
    onStart: () => void;
}

export function IntroSection({ onStart }: IntroSectionProps) {
    return (
        <div className="flex-1 h-full flex flex-col justify-center px-8 md:px-20 max-w-7xl mx-auto overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-6"
            >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-blue-400 font-mono mb-4">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    System Online
                </div>

                <h1 className="text-5xl md:text-8xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-500">
                    Project <br />
                    <span className="text-blue-500">ALAN</span>
                </h1>

                <p className="text-lg md:text-xl text-gray-400 max-w-2xl leading-relaxed">
                    An autonomous multi-agent system designed for advanced reasoning, real-time voice interaction, and rapid task execution.
                    Experience the future of personal AI.
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                    <button
                        onClick={onStart}
                        className="group relative px-8 py-4 bg-white text-black font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors">
                            Initialize System <ArrowRight size={20} />
                        </span>
                    </button>

                    <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-full font-medium text-white hover:bg-white/10 transition-all">
                        View Documentation
                    </button>
                </div>

                <div className="flex gap-6 pt-12 text-gray-500">
                    <Github className="hover:text-white cursor-pointer transition-colors" />
                    <Twitter className="hover:text-white cursor-pointer transition-colors" />
                    <Linkedin className="hover:text-white cursor-pointer transition-colors" />
                </div>
            </motion.div>
        </div>
    );
}
