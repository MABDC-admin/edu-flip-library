import { cn } from '@/lib/utils';

interface AmbientBackgroundProps {
    isFullscreen?: boolean;
}

export function AmbientBackground({ isFullscreen }: AmbientBackgroundProps) {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div
                className={cn(
                    "absolute inset-[-10%] opacity-40 blur-[100px] animate-pulse pointer-events-none transition-all duration-1000",
                    isFullscreen ? "bg-black" : ""
                )}
                style={{
                    background: `radial-gradient(circle at 20% 30%, #3b82f6 0%, transparent 50%), 
                       radial-gradient(circle at 80% 70%, #8b5cf6 0%, transparent 50%),
                       radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)`
                }}
            />
        </div>
    );
}
