import { Button } from '@/components/ui/button';
import {
    X,
    LayoutGrid,
    Square,
    BookOpen,
    Monitor,
    Minimize2,
    Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReaderHeaderProps {
    title: string;
    onBack: () => void;
    onShowThumbnails: () => void;
    viewMode: 'single' | 'double';
    onViewModeChange: (mode: 'single' | 'double') => void;
    isMaximized: boolean;
    onToggleMaximize: () => void;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
}

export function ReaderHeader({
    title,
    onBack,
    onShowThumbnails,
    viewMode,
    onViewModeChange,
    isMaximized,
    onToggleMaximize,
    isFullscreen,
    onToggleFullscreen
}: ReaderHeaderProps) {
    return (
        <header
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className={cn(
                "fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl flex items-center justify-between p-2 px-4 bg-black/60 backdrop-blur-2xl text-white z-50 rounded-full border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-500",
                isMaximized && "-translate-y-32 opacity-0"
            )}
        >
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    className="text-white hover:bg-white/10"
                >
                    <X className="w-5 h-5" />
                </Button>

                <div className="hidden sm:block">
                    <h1 className="font-display font-semibold text-lg truncate max-w-[200px] xl:max-w-[400px]">
                        {title}
                    </h1>
                </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onShowThumbnails}
                    className="text-white hover:bg-white/10"
                    title="Show Thumbnails"
                >
                    <LayoutGrid className="w-5 h-5" />
                </Button>

                <div className="w-[1px] h-6 bg-white/10 mx-1" />

                <div className="flex items-center bg-white/5 rounded-full p-1 mr-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewModeChange('single')}
                        className={cn(
                            "w-8 h-8 rounded-full transition-colors",
                            viewMode === 'single' ? "bg-primary text-white" : "text-white/40 hover:text-white"
                        )}
                        title="Single Page"
                    >
                        <Square className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewModeChange('double')}
                        className={cn(
                            "w-8 h-8 rounded-full transition-colors",
                            viewMode === 'double' ? "bg-primary text-white" : "text-white/40 hover:text-white"
                        )}
                        title="Double Page"
                    >
                        <BookOpen className="w-4 h-4" />
                    </Button>
                </div>

                <div className="w-[1px] h-6 bg-white/10 mx-1 hidden sm:block" />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleMaximize}
                    className={cn("text-white hover:bg-white/10", isMaximized && "text-primary")}
                    title={isMaximized ? "Exit Theater Mode" : "Theater Mode"}
                >
                    <Monitor className="w-5 h-5" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleFullscreen}
                    className="text-white hover:bg-white/10"
                    title="Fullscreen"
                >
                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </Button>
            </div>
        </header>
    );
}
