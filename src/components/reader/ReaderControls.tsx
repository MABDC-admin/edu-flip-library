import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Printer, LocateFixed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReaderControlsProps {
    zoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetView?: () => void;
    isPanned?: boolean;
    pdfUrl: string | null;
    isVisible: boolean;
}

export function ReaderControls({
    zoom,
    onZoomIn,
    onZoomOut,
    onResetView,
    isPanned,
    pdfUrl,
    isVisible
}: ReaderControlsProps) {
    if (!isVisible) return null;

    return (
        <div
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-2xl py-2 px-6 rounded-full border border-white/20 flex items-center justify-center gap-4 z-50 shadow-[0_8px_32px_rgba(37,99,235,0.2)] transition-all hover:bg-black/80 hover:border-white/30"
        >
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onZoomOut}
                    disabled={zoom <= 0.5}
                    className="w-8 h-8 text-white hover:bg-white/10 rounded-full"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-4 h-4" />
                </Button>
                <button
                    onClick={onResetView}
                    className="text-[10px] text-white/80 font-mono w-12 text-center font-bold hover:text-white transition-colors"
                    title="Reset View (press 0)"
                >
                    {Math.round(zoom * 100)}%
                </button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onZoomIn}
                    disabled={zoom >= 4}
                    className="w-8 h-8 text-white hover:bg-white/10 rounded-full"
                    title="Zoom In"
                >
                    <ZoomIn className="w-4 h-4" />
                </Button>
            </div>

            {/* Reset view button -- appears when panned */}
            {isPanned && onResetView && (
                <>
                    <div className="w-[1px] h-6 bg-white/20 mx-1" />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onResetView}
                        className={cn(
                            "w-8 h-8 text-white hover:bg-white/10 rounded-full",
                            "animate-in fade-in-0 zoom-in-95 duration-200"
                        )}
                        title="Reset Pan (press 0)"
                    >
                        <LocateFixed className="w-4 h-4" />
                    </Button>
                </>
            )}

            <div className="w-[1px] h-6 bg-white/20 mx-1" />

            <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                    if (pdfUrl) {
                        const printWindow = window.open(pdfUrl, '_blank');
                        if (printWindow) {
                            printWindow.print();
                        }
                    }
                }}
                className="w-8 h-8 text-white hover:bg-white/10 rounded-full"
                title="Print PDF"
            >
                <Printer className="w-4 h-4" />
            </Button>
        </div>
    );
}
