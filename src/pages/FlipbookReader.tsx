import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBook, useBookPages, useReadingProgress, useUpdateReadingProgress } from '@/hooks/useBooks';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Maximize2, 
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function FlipbookReader() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  
  const { data: book, isLoading: bookLoading } = useBook(bookId);
  const { data: pages, isLoading: pagesLoading } = useBookPages(bookId);
  const { data: progress } = useReadingProgress(bookId);
  const updateProgress = useUpdateReadingProgress();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Initialize from saved progress
  useEffect(() => {
    if (progress?.current_page) {
      setCurrentPage(progress.current_page);
    }
  }, [progress]);
  
  // Save progress on page change
  const saveProgress = useCallback((page: number) => {
    if (!bookId || !book) return;
    const completed = page >= book.page_count;
    updateProgress.mutate({ bookId, currentPage: page, completed });
  }, [bookId, book, updateProgress]);
  
  // Debounced progress save
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveProgress(currentPage);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [currentPage, saveProgress]);
  
  const totalPages = pages?.length || book?.page_count || 0;
  
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || isFlipping) return;
    
    const direction = page > currentPage ? 'next' : 'prev';
    setFlipDirection(direction);
    setIsFlipping(true);
    
    setTimeout(() => {
      setCurrentPage(page);
      setIsFlipping(false);
      setFlipDirection(null);
    }, 600);
  };
  
  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          nextPage();
          break;
        case 'ArrowLeft':
          prevPage();
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          } else {
            navigate(-1);
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, isFullscreen]);
  
  // Fullscreen handling
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // Zoom controls
  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const resetZoom = () => setZoom(1);
  
  // Touch gesture handling
  const touchStartX = useRef<number | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextPage();
      } else {
        prevPage();
      }
    }
    
    touchStartX.current = null;
  };
  
  const currentPageData = pages?.find((p) => p.page_number === currentPage);
  const nextPageData = pages?.find((p) => p.page_number === currentPage + 1);
  
  if (bookLoading || pagesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="w-64 h-96 mx-auto rounded-lg" />
          <Skeleton className="w-48 h-6 mx-auto" />
        </div>
      </div>
    );
  }
  
  if (!book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">Book not found</p>
          <Button onClick={() => navigate('/bookshelf')}>Back to Bookshelf</Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col",
        isFullscreen && "bg-black"
      )}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between p-4 text-white">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/bookshelf')}
          className="text-white hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </Button>
        
        <h1 className="font-display font-semibold text-lg truncate max-w-[50%]">
          {book.title}
        </h1>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/10"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main reading area */}
      <main 
        className="flex-1 flex items-center justify-center p-4 relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation arrows */}
        <Button
          variant="ghost"
          size="icon"
          onClick={prevPage}
          disabled={currentPage <= 1 || isFlipping}
          className={cn(
            "absolute left-4 z-10 w-12 h-12 rounded-full bg-white/10 text-white",
            "hover:bg-white/20 disabled:opacity-30",
            "hidden md:flex"
          )}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={nextPage}
          disabled={currentPage >= totalPages || isFlipping}
          className={cn(
            "absolute right-4 z-10 w-12 h-12 rounded-full bg-white/10 text-white",
            "hover:bg-white/20 disabled:opacity-30",
            "hidden md:flex"
          )}
        >
          <ChevronRight className="w-6 h-6" />
        </Button>

        {/* Book container */}
        <div 
          className="relative perspective-[2000px]"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Book wrapper for 3D effect */}
          <div className="relative w-[300px] sm:w-[400px] md:w-[500px] lg:w-[600px]">
            {/* Current page */}
            <div 
              className={cn(
                "aspect-[3/4] rounded-lg overflow-hidden shadow-2xl bg-white",
                "transform-style-preserve-3d transition-transform duration-600",
                isFlipping && flipDirection === 'next' && "animate-page-flip"
              )}
            >
              {currentPageData?.image_url ? (
                <img
                  src={currentPageData.image_url}
                  alt={`Page ${currentPage}`}
                  className="w-full h-full object-contain bg-white"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                  <div className="text-center p-8">
                    <p className="text-6xl font-display font-bold text-primary/30">
                      {currentPage}
                    </p>
                    <p className="text-muted-foreground mt-2">Page {currentPage}</p>
                  </div>
                </div>
              )}
              
              {/* Page curl shadow */}
              <div className="absolute inset-0 bg-gradient-to-l from-black/5 to-transparent pointer-events-none" />
            </div>
            
            {/* Book spine shadow */}
            <div className="absolute -left-2 top-2 bottom-2 w-4 bg-gradient-to-r from-black/30 to-transparent rounded-l-sm" />
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/10 rounded-full p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            disabled={zoom <= 0.5}
            className="w-8 h-8 text-white hover:bg-white/10"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={resetZoom}
            className="w-8 h-8 text-white hover:bg-white/10"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            disabled={zoom >= 3}
            className="w-8 h-8 text-white hover:bg-white/10"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </main>

      {/* Bottom progress bar */}
      <footer className="p-4 space-y-3">
        <div className="flex items-center gap-4 text-white">
          <span className="text-sm font-medium min-w-[60px]">
            Page {currentPage}
          </span>
          
          <Slider
            value={[currentPage]}
            min={1}
            max={totalPages}
            step={1}
            onValueChange={([value]) => goToPage(value)}
            className="flex-1"
          />
          
          <span className="text-sm text-white/60 min-w-[40px] text-right">
            {totalPages}
          </span>
        </div>
        
        {/* Progress percentage */}
        <div className="flex justify-center">
          <span className="text-xs text-white/40">
            {Math.round((currentPage / totalPages) * 100)}% complete
          </span>
        </div>
      </footer>
    </div>
  );
}
