import React from 'react';
import { appConfig } from '../app-config';

interface IntroPageProps {
    onConnect: () => void;
}

export const IntroPage: React.FC<IntroPageProps> = ({ onConnect }) => {
    return (
        <div className="h-full w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black text-white flex flex-col items-center justify-center relative overflow-hidden">

            {/* Background Grid/Effect */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

            {/* Central Visual - Static Arc Reactor Concept for Intro */}
            <div className="relative mb-12 scale-150">
                {/* Simple Pulse Ring */}
                <div className="w-64 h-64 border-2 border-cyan-500 rounded-full animate-[spin_10s_linear_infinite] opacity-50 border-t-transparent border-l-transparent"></div>
                <div className="absolute inset-0 m-auto w-48 h-48 border-2 border-cyan-400 rounded-full animate-[spin_5s_linear_infinite_reverse] border-b-transparent border-r-transparent"></div>
                <div className="absolute inset-0 m-auto w-32 h-32 bg-cyan-500 rounded-full opacity-10 animate-pulse"></div>
                <div className="absolute inset-0 m-auto w-24 h-24 bg-cyan-400/20 rounded-full blur-xl"></div>
                <div className="absolute inset-0 m-auto flex items-center justify-center">
                    <div className="w-16 h-16 bg-cyan-300 rounded-full shadow-[0_0_50px_cyan]"></div>
                </div>
            </div>

            {/* Text Content */}
            <div className="text-center z-10 space-y-6">
                <h1 className="text-xl md:text-2xl font-light tracking-wider text-gray-300">
                    Chat live with F.R.I.D.A.Y, your voice AI agent.
                </h1>

                <button
                    onClick={onConnect}
                    className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-widest rounded-full transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] transform hover:scale-105 active:scale-95"
                >
                    TALK TO F.R.I.D.A.Y
                </button>
            </div>
        </div>
    );
};
