import React, { ReactNode } from 'react';

interface PortfolioLayoutProps {
    children: ReactNode;
}

export function PortfolioLayout({ children }: PortfolioLayoutProps) {
    return (
        <div className="flex h-screen w-full bg-black text-white overflow-hidden selection:bg-blue-500/30">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 w-[30%] h-[30%] bg-cyan-900/10 rounded-full blur-[100px]" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex h-full w-full">
                {children}
            </div>
        </div>
    );
}
