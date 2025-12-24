'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const IntroOverlay = ({ onComplete }: { onComplete: () => void }) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        // Step 1: Initialize (0s)
        // Step 2: Spin Up (1s)
        // Step 3: Online (3s)
        // Step 4: Finish (4s)
        const t1 = setTimeout(() => setStep(1), 500);
        const t2 = setTimeout(() => setStep(2), 2000);
        const t3 = setTimeout(() => onComplete(), 4500);

        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onComplete]);

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)] opacity-20" />

            <div className="relative flex flex-col items-center">
                {/* JARVIS RINGS */}
                <div className="relative w-96 h-96 flex items-center justify-center">
                    {/* Ring 1 */}
                    <motion.div
                        className="absolute w-full h-full border-2 border-cyan-500/30 rounded-full border-dashed"
                        animate={{ rotate: 360, scale: [0.8, 1, 0.8] }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    />
                    {/* Ring 2 */}
                    <motion.div
                        className="absolute w-80 h-80 border border-cyan-400/50 rounded-full border-t-transparent border-l-transparent"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                    {/* Ring 3 */}
                    <motion.div
                        className="absolute w-60 h-60 border-4 border-blue-500/20 rounded-full border-dashed"
                        animate={{ rotate: 180 }}
                        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                    />

                    {/* Center Text */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col items-center"
                    >
                        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 tracking-tighter filter drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                            ALAN
                        </h1>
                        <div className="text-xs font-mono text-cyan-500 tracking-[0.5em] mt-2">
                            SYSTEM INITIALIZED
                        </div>
                    </motion.div>
                </div>

                {/* Loading Bar */}
                <div className="mt-12 w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-cyan-400 shadow-[0_0_10px_cyan]"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 3, ease: "easeInOut" }}
                    />
                </div>

                {/* Status Text */}
                <div className="mt-4 font-mono text-xs text-cyan-600">
                    {step === 0 && "BOOT SEQUENCING..."}
                    {step === 1 && "LOADING MODULES..."}
                    {step === 2 && "ESTABLISHING UPLINK..."}
                </div>
            </div>
        </div>
    );
};
