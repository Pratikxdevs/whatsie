import { useState, useEffect, useRef } from "react";
import StarBackground from "../shared/backgrounds/StarBackground";

const PuppetStage = () => {
    // Instant tracking for eyes/mouth/body
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    // Input focus state
    const [focusedInputPos, setFocusedInputPos] = useState<{ x: number, y: number } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let animationFrameId: number;
        let isTicking = false;

        const handleMouseMove = (e: MouseEvent) => {
            if (isTicking) return;

            isTicking = true;
            animationFrameId = requestAnimationFrame(() => {
                // Normalized -1 to 1
                const x = (e.clientX / window.innerWidth - 0.5) * 2;
                const y = (e.clientY / window.innerHeight - 0.5) * 2;

                setMousePos({ x, y });
                isTicking = false;
            });
        };

        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT') {
                const rect = target.getBoundingClientRect();
                const x = ((rect.left + rect.width / 2) / window.innerWidth - 0.5) * 2;
                const y = ((rect.top + rect.height / 2) / window.innerHeight - 0.5) * 2;
                setFocusedInputPos({ x, y });
            }
        };

        const handleFocusOut = () => {
            setFocusedInputPos(null);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("focusin", handleFocusIn);
        window.addEventListener("focusout", handleFocusOut);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("focusin", handleFocusIn);
            window.removeEventListener("focusout", handleFocusOut);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // Determine the active target position (Input takes priority)
    const activePos = focusedInputPos || mousePos;

    // 1. Instant Pupil Movement (No transition)
    const getInstantOffset = (limit: number) => ({
        transform: `translate(${activePos.x * limit}px, ${activePos.y * limit}px)`,
    });

    // 2. Smoothed Eye/Container Movement (Dwell effect)
    const getSmoothedOffset = (limit: number) => ({
        transform: `translate(${activePos.x * limit}px, ${activePos.y * limit}px)`,
        transition: "transform 0.2s cubic-bezier(0.2, 0, 0, 1)"
    });

    // Body Movement
    const getBodyStyle = (limit: number, zIndex: number, baseRotation: number = 0, isBluePuppet: boolean = false) => {
        let rotation = baseRotation + (activePos.x * limit);
        let translateY = 0;

        if (isBluePuppet && focusedInputPos) {
            translateY = -110;
            rotation += 4;
        }

        return {
            transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
            transition: "transform 0.3s cubic-bezier(0.2, 0, 0, 1)",
            zIndex: zIndex
        };
    };

    return (
        <div
            ref={containerRef}
            className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-black items-end justify-center h-full"
        >
            {/* Shooting Stars Background */}
            {/* Note: StarBackground should be memoized itself, but being inside here isolates it from form updates */}
            <div className="absolute inset-0 z-0">
                <StarBackground />
            </div>

            {/* Branding */}
            <div className="absolute top-8 left-8 text-white font-bold text-xl tracking-tight z-30">
                Whatsie
            </div>

            {/* Puppet Container - Centered Bottom */}
            <div className="relative w-full max-w-lg h-full flex items-end justify-center pb-0 scale-90 origin-bottom">

                {/* 1. Purple Tall (Back Left) - The "Blue Puppet" (RESET & WIDER) */}
                <div
                    className="absolute -bottom-12 left-[15%] w-[212px] h-[36rem] bg-[#6d5dfc] rounded-t-[10px] flex justify-center pt-32 origin-bottom"
                    style={getBodyStyle(2, 0, 0, true)}
                >
                    <div className="flex gap-10 mt-2">
                        {/* Eyes: Sclera (Smoothed) + Pupil (Instant) */}
                        <div
                            className="w-8 h-8 bg-white rounded-full flex items-center justify-center overflow-hidden"
                            style={getSmoothedOffset(6)}
                        >
                            <div className="w-3 h-3 bg-black rounded-full" style={getInstantOffset(10)}></div>
                        </div>
                        <div
                            className="w-8 h-8 bg-white rounded-full flex items-center justify-center overflow-hidden"
                            style={getSmoothedOffset(6)}
                        >
                            <div className="w-3 h-3 bg-black rounded-full" style={getInstantOffset(10)}></div>
                        </div>
                    </div>
                </div>

                {/* 2. Black Medium (Back Right) */}
                <div
                    className="absolute -bottom-12 left-[45%] w-40 h-[30rem] bg-[#222222] border-2 border-[#333] rounded-t-[5rem] flex justify-center pt-24 origin-bottom"
                    style={getBodyStyle(2, 10)}
                >
                    <div className="flex gap-8 mt-2">
                        <div
                            className="w-7 h-7 bg-white rounded-full flex items-center justify-center overflow-hidden"
                            style={getSmoothedOffset(6)}
                        >
                            <div className="w-2.5 h-2.5 bg-black rounded-full" style={getInstantOffset(10)}></div>
                        </div>
                        <div
                            className="w-7 h-7 bg-white rounded-full flex items-center justify-center overflow-hidden"
                            style={getSmoothedOffset(6)}
                        >
                            <div className="w-2.5 h-2.5 bg-black rounded-full" style={getInstantOffset(10)}></div>
                        </div>
                    </div>
                </div>

                {/* 3. Salmon Blob (Front Left) */}
                <div
                    className="absolute -bottom-12 left-[5%] w-64 h-[16rem] bg-[#FF9F7F] rounded-t-[10rem] flex justify-center pt-20 origin-bottom"
                    style={getBodyStyle(2, 20)}
                >
                    <div className="flex gap-12" style={getSmoothedOffset(5)}>
                        <div className="w-3.5 h-3.5 bg-black rounded-full" style={getInstantOffset(15)}></div>
                        <div className="w-3.5 h-3.5 bg-black rounded-full" style={getInstantOffset(15)}></div>
                    </div>
                </div>

                {/* 4. Yellow Short (Front Right) */}
                <div
                    className="absolute -bottom-12 right-[10%] w-44 h-[18rem] bg-[#FDE047] rounded-t-[5rem] flex flex-col items-center pt-20 origin-bottom"
                    style={getBodyStyle(2, 20, 0)}
                >
                    <div className="flex gap-8" style={getSmoothedOffset(5)}>
                        <div className="w-3 h-3 bg-black rounded-full" style={getInstantOffset(15)}></div>
                        <div className="w-3 h-3 bg-black rounded-full" style={getInstantOffset(15)}></div>
                    </div>
                    {/* Mouth */}
                    <div
                        className="w-24 h-1.5 bg-[#1F2937] rounded-full mt-8 opacity-80"
                        style={getInstantOffset(10)}
                    ></div>
                </div>

            </div>
        </div>
    );
};

export default PuppetStage;
