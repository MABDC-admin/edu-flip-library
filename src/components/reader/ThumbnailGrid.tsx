import { Button } from '@/components/ui/button';
import { LayoutGrid, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookPage } from '@/types/database';

interface ThumbnailGridProps {
    isOpen: boolean;
    onClose: () => void;
    totalPages: number;
    currentPage: number;
    onPageSelect: (page: number) => void;
    pages: BookPage[] | null;
}

export function ThumbnailGrid({
    isOpen,
    onClose,
    totalPages,
    currentPage,
    onPageSelect,
    pages
}: ThumbnailGridProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300 flex flex-col"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <LayoutGrid className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-display font-semibold text-white">All Pages</h2>
                    <span className="text-sm text-white/40 font-mono">({totalPages} pages)</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-white hover:bg-white/10 rounded-full"
                >
                    <X className="w-6 h-6" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 max-w-7xl mx-auto">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        const pageData = pages?.find(pd => pd.page_number === p);
                        const isActive = currentPage === p;

                        return (
                            <button
                                key={`grid-thumb-${p}`}
                                onClick={() => onPageSelect(p)}
                                className={cn(
                                    "group relative flex flex-col gap-2 transition-all duration-300",
                                    isActive ? "scale-105" : "hover:scale-105"
                                )}
                            >
                                <div className={cn(
                                    "aspect-[3/4] w-full bg-slate-900 rounded-lg overflow-hidden border-2 transition-all shadow-lg",
                                    isActive ? "border-primary ring-4 ring-primary/20" : "border-white/5 group-hover:border-white/20"
                                )}>
                                    {pageData?.svg_url || pageData?.thumbnail_url || pageData?.image_url ? (
                                        <img
                                            src={(pageData.svg_url || pageData.thumbnail_url || pageData.image_url) as string}
                                            alt={`Page ${p}`}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full text-2xl text-slate-700 font-bold">
                                            {p}
                                        </div>
                                    )}

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="bg-primary text-white px-3 py-1 rounded-full text-xs font-bold shadow-xl">
                                            Go to Page {p}
                                        </div>
                                    </div>
                                </div>
                                <span className={cn(
                                    "text-xs font-mono text-center transition-colors",
                                    isActive ? "text-primary font-bold" : "text-white/40 group-hover:text-white/80"
                                )}>
                                    Page {p}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
