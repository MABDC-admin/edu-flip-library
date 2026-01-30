import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBook, useBookPages, useReadingProgress, useUpdateReadingProgress } from '@/hooks/useBooks';
import { useAuth } from '@/contexts/AuthContext';
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
  RotateCcw,
  LayoutGrid,
  BookCopy,
  GraduationCap,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// react-pdf imports
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Optimize PDF loading options
const pdfOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  disableRange: false, // Enable range requests (streaming)
  disableStream: false,
  disableAutoFetch: true, // Don't fetch the whole file automatically
};

export default function FlipbookReader() {

  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: book, isLoading: bookLoading } = useBook(bookId);
  const { data: pages } = useBookPages(bookId);
  const { data: progress } = useReadingProgress(bookId);
  const updateProgress = useUpdateReadingProgress();

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'double'>('single');
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive view mode
  useEffect(() => {
    const handleResize = () => {
      // Allow double view on tablets (768px+) if they are wide enough
      setViewMode(window.innerWidth >= 768 ? 'double' : 'single');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize from saved progress
  useEffect(() => {
    if (progress?.current_page) {
      setCurrentPage(progress.current_page);
    }
  }, [progress]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log("PDF Loaded successfully. Total pages:", numPages);
    setNumPages(numPages);
    if (pages && pages.length > 0) {
      console.log("Hybrid Mode: Using pre-generated images.", pages.length);
    } else {
      console.log("Fallback Mode: Using client-side PDF rendering.");
    }
  }

  // Save progress on page change
  const saveProgress = useCallback((page: number) => {
    if (!bookId || !book) return;
    const completed = page >= (numPages || book.page_count || 1);
    updateProgress.mutate({ bookId, currentPage: page, completed });
  }, [bookId, book, numPages, updateProgress]);

  // Debounced progress save
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveProgress(currentPage);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [currentPage, saveProgress]);

  const totalPages = numPages || book?.page_count || 0;

  const playFlipSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => { }); // Ignore autoplay blocks
  };

  const goToPage = useCallback((page: number) => {
    if (page < 1 || page > totalPages || isFlipping) return;

    setIsFlipping(true);

    // Short timeout for animation effect
    setTimeout(() => {
      setCurrentPage(page);
      setIsFlipping(false);
    }, 300);
  }, [currentPage, totalPages, isFlipping]);

  const handlePageChange = useCallback((page: number) => {
    if (page < 1 || page > totalPages || isFlipping) return;
    playFlipSound();
    goToPage(page);
  }, [totalPages, isFlipping, goToPage]);

  const handleNext = useCallback(() => {
    const increment = viewMode === 'double' ? (currentPage === 1 ? 1 : 2) : 1;
    handlePageChange(Math.min(currentPage + increment, totalPages));
  }, [currentPage, totalPages, viewMode, handlePageChange]);

  const handlePrev = useCallback(() => {
    const decrement = viewMode === 'double' ? (currentPage <= 2 ? 1 : 2) : 1;
    handlePageChange(Math.max(currentPage - decrement, 1));
  }, [currentPage, totalPages, viewMode, handlePageChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrev();
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
  }, [handleNext, handlePrev, isFullscreen, navigate]);

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
        handleNext();
      } else {
        handlePrev();
      }
    }

    touchStartX.current = null;
  };

  // Determine page data for image-based rendering
  const currentPageData = pages?.find((p) => p.page_number === currentPage);
  const leftPageData = viewMode === 'double' ? pages?.find((p) => p.page_number === currentPage) : currentPageData;
  const rightPageData = viewMode === 'double' ? pages?.find((p) => p.page_number === currentPage + 1) : null;

  // Determine which page numbers to show (for PDF rendering)
  const leftPageNum = viewMode === 'double' ? currentPage : currentPage;
  const rightPageNum = viewMode === 'double' ? currentPage + 1 : null;

  if (bookLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="w-64 h-96 mx-auto rounded-lg" />
          <Skeleton className="w-48 h-6 mx-auto" />
        </div>
      </div>
    );
  }

  if (!book || (!book.pdf_url && !book.html5_url)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">Book source not found</p>
          <Button onClick={() => navigate('/bookshelf')}>Back to Bookshelf</Button>
        </div>
      </div>
    );
  }

  // HTML5 Flipbook Mode
  if (book.html5_url) {
    return (
      <div className="min-h-screen bg-black flex flex-col relative overflow-hidden font-sans">
        <header className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent text-white z-30 pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/bookshelf')}
              className="text-white hover:bg-white/20 rounded-full bg-black/20 backdrop-blur-md"
            >
              <X className="w-6 h-6" />
            </Button>
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-xl tracking-tight drop-shadow-md">
                MABDC <span className="font-normal opacity-80 text-base ml-2 border-l border-white/30 pl-2">{book?.title}</span>
              </h1>
            </div>
          </div>
        </header>

        <iframe
          src={book.html5_url}
          className="flex-1 w-full h-full border-none bg-white"
          title={book.title}
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black flex flex-col relative overflow-hidden font-sans",
        isFullscreen && "bg-black"
      )}
    >
      {/* Background Decor - Subtle Glass Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Overlay Bar */}
      <header className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent backdrop-blur-[2px] text-white z-30 transition-transform duration-300 pointer-events-none">

        {/* Left: Back + Title */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/bookshelf')}
            className="text-white hover:bg-white/20 rounded-full backdrop-blur-md bg-black/20"
          >
            <X className="w-6 h-6" />
          </Button>
          <div className="hidden sm:block">
            <h1 className="font-display font-bold text-xl tracking-tight drop-shadow-md">
              MABDC <span className="font-normal opacity-80 text-base ml-2 border-l border-white/30 pl-2">{book?.title}</span>
            </h1>
          </div>
        </div>

        {/* Center: Tablet Avatar (Visible 768px-1024px) */}
        <div className="hidden md:flex lg:hidden items-center gap-3 bg-white/5 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/10 shadow-lg pointer-events-auto ring-1 ring-white/5">
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Profile" className="w-6 h-6 rounded-full object-cover ring-2 ring-white/20" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold shadow-inner">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <span className="text-xs font-medium opacity-90 truncate max-w-[100px] tracking-wide">
            {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
          </span>
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/20 rounded-full backdrop-blur-md bg-black/20"
            title="Full Screen"
          >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </Button>
        </div>
      </header>

      {/* Main Reading Area */}
      <main
        className="flex-1 flex items-center justify-center relative w-full h-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="hidden">
          <Document
            file={book.pdf_url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div />}
            error={null}
          >
          </Document>
        </div>

        {/* Navigation Arrows (Glass Style) */}
        <button
          onClick={handlePrev}
          disabled={currentPage <= 1}
          className={cn(
            "absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-md border border-white/10 transition-all shadow-xl active:scale-95 flex items-center justify-center disabled:opacity-0 disabled:pointer-events-none group",
            "hidden sm:flex"
          )}
        >
          <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          className={cn(
            "absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-md border border-white/10 transition-all shadow-xl active:scale-95 flex items-center justify-center disabled:opacity-0 disabled:pointer-events-none group",
            "hidden sm:flex"
          )}
        >
          <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Book Container */}
        <div
          className="relative transition-transform duration-300 origin-center max-w-full max-h-full flex items-center justify-center p-0 sm:p-2"
          style={{ transform: `scale(${zoom})` }}
        >
          {pages && pages.length > 0 ? (
            /* Image Hybrid Mode */
            <div className={cn(
              "relative flex transition-all duration-500 ease-out shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-slate-100", // Stronger shadow, better bg
              viewMode === 'double'
                ? "aspect-[1.414] h-auto w-[98vw] md:h-[90vh] md:w-auto rounded-sm"
                : "aspect-[0.707] h-auto w-[98vw] md:h-[90vh] md:w-auto rounded-sm"
            )}>
              {/* Left/Single Page */}
              <div className={cn(
                "flex-1 relative bg-white flex items-center justify-center overflow-hidden",
                viewMode === 'double' && "border-r border-slate-200"
              )}>
                {leftPageData?.image_url ? (
                  <img src={leftPageData.image_url} alt="" className="w-full h-full object-contain select-none" draggable={false} />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-slate-300">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                )}
              </div>

              {/* Right Page (Double View) */}
              {viewMode === 'double' && (
                <div className="flex-1 relative bg-white flex items-center justify-center overflow-hidden">
                  {rightPageData?.image_url ? (
                    <img src={rightPageData.image_url} alt="" className="w-full h-full object-contain select-none" draggable={false} />
                  ) : (
                    rightPageNum && rightPageNum <= totalPages ? (
                      <div className="flex items-center justify-center w-full h-full text-slate-300">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    ) : <div className="bg-slate-100 w-full h-full" /> // End of book
                  )}
                  <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/10 to-transparent pointer-events-none mix-blend-multiply" />
                </div>
              )}
            </div>
          ) : (
            /* Fallback Mode - Styled to match Immersive UI */
            <div className={cn(
              "relative flex transition-all duration-500 ease-out shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-slate-100",
              viewMode === 'double'
                ? "aspect-[1.414] h-auto w-[98vw] md:h-[90vh] md:w-auto rounded-sm"
                : "aspect-[0.707] h-auto w-[98vw] md:h-[90vh] md:w-auto rounded-sm"
            )}>
              <Document file={book.pdf_url} className="flex w-full h-full" loading={<Loader2 className="animate-spin text-indigo-500 w-10 h-10" />}>
                <div className={cn("flex-1 bg-white relative overflow-hidden flex items-center justify-center", viewMode === 'double' && "border-r border-slate-200")}>
                  <Page
                    pageNumber={leftPageNum}
                    height={window.innerHeight * 0.9}
                    className="max-w-full max-h-full object-contain"
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                </div>
                {viewMode === 'double' && rightPageNum && rightPageNum <= totalPages && (
                  <div className="flex-1 bg-white relative overflow-hidden flex items-center justify-center">
                    <Page
                      pageNumber={rightPageNum}
                      height={window.innerHeight * 0.9}
                      className="max-w-full max-h-full object-contain"
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                    <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/10 to-transparent pointer-events-none mix-blend-multiply" />
                  </div>
                )}
              </Document>
            </div>
          )}
        </div>
      </main>

      {/* Thumbnail Navigation Bar (Slide up) - GLASSMOPHISM & LARGE THUMBNAILS */}
      <div className={cn(
        "absolute bottom-20 left-0 right-0 max-h-[40vh] bg-black/60 backdrop-blur-2xl border-t border-white/10 transition-transform duration-300 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-2xl mx-4 lg:mx-20",
        showThumbnails ? "translate-y-0" : "translate-y-[150%]"
      )}>
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
          <span className="text-xs font-bold text-white/80 uppercase tracking-widest flex items-center gap-2">
            <LayoutGrid className="w-3 h-3" /> Page Navigator
          </span>
          <button onClick={() => setShowThumbnails(false)} className="text-white/60 hover:text-white transition-colors bg-white/5 p-1 rounded-full"><X className="w-4 h-4" /></button>
        </div>
        <ScrollArea className="w-full whitespace-nowrap p-6">
          <div className="flex gap-6 pb-4">
            {pages?.map((p) => (
              <button
                key={p.page_number}
                onClick={() => { handlePageChange(p.page_number); setShowThumbnails(false); }}
                className={cn(
                  "relative group flex-shrink-0 w-32 md:w-40 aspect-[0.707] bg-white/5 rounded-md overflow-hidden transition-all duration-300 hover:scale-105 hover:ring-2 hover:ring-indigo-400 hover:shadow-lg hover:-translate-y-1",
                  currentPage === p.page_number && "ring-2 ring-indigo-500 scale-105 shadow-xl ring-offset-2 ring-offset-black"
                )}
              >
                <img src={p.image_url} className="w-full h-full object-cover opacity-90 group-hover:opacity-100" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm text-white text-xs font-medium text-center py-1 border-t border-white/10">
                  Page {p.page_number}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Floating Bottom Controls - GLASSMOPHISM */}
      <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 p-2 pl-5 pr-3 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl transition-all hover:bg-black/60 ring-1 ring-white/5">

        {/* Thumbnails Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowThumbnails(!showThumbnails)}
          className={cn("text-white/80 hover:text-white hover:bg-white/10 rounded-full h-9 w-9 transition-all", showThumbnails && "text-indigo-400 bg-white/10 shadow-inner")}
          title="Show Thumbnails"
        >
          <LayoutGrid className="w-4 h-4" />
        </Button>

        <div className="h-5 w-[1px] bg-white/10" />

        {/* Page Count */}
        <div className="flex items-center gap-3 text-white font-medium font-mono text-sm min-w-[80px] justify-center cursor-pointer hover:text-indigo-400 transition-colors select-none group" onClick={() => setShowThumbnails(true)}>
          <span className="group-hover:scale-110 transition-transform">{currentPage}</span>
          <span className="opacity-40">/</span>
          <span className="opacity-80">{totalPages}</span>
        </div>

        <div className="h-5 w-[1px] bg-white/10" />

        {/* View Mode */}
        <Button variant="ghost" size="icon" onClick={() => setViewMode(v => v === 'single' ? 'double' : 'single')} className="text-white/80 hover:text-white hover:bg-white/10 rounded-full h-9 w-9 hidden sm:flex transition-transform hover:scale-105">
          {viewMode === 'double' ? <BookCopy className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-white/5 rounded-full p-0.5 border border-white/5">
          <Button variant="ghost" size="icon" onClick={zoomOut} className="text-white hover:text-white hover:bg-white/10 rounded-full h-8 w-8">
            <ZoomOut className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" onClick={zoomIn} className="text-white hover:text-white hover:bg-white/10 rounded-full h-8 w-8">
            <ZoomIn className="w-3 h-3" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
