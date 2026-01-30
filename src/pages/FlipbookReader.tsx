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
      setViewMode(window.innerWidth >= 1024 ? 'double' : 'single');
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

  if (!book || !book.pdf_url) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">Book or PDF source not found</p>
          <Button onClick={() => navigate('/bookshelf')}>Back to Bookshelf</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col transition-colors duration-500",
        isFullscreen && "bg-black"
      )}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-md text-white z-20">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/bookshelf')}
            className="text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>

          <div className="hidden sm:block">
            <h1 className="font-display font-semibold text-lg truncate max-w-[300px]">
              {book.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Thumbnails Sheet - Simplified to just a list for now, or could implement PDF thumbnails later */}
          <Sheet open={showThumbnails} onOpenChange={setShowThumbnails}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <LayoutGrid className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[40vh] sm:h-[50vh] bg-slate-900 border-slate-800 text-white">
              <SheetHeader>
                <SheetTitle className="text-white flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Jump to Page
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-full mt-4 pb-8">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        handlePageChange(p);
                        setShowThumbnails(false);
                      }}
                      className={cn(
                        "p-4 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors text-center",
                        currentPage === p ? "ring-2 ring-primary" : ""
                      )}
                    >
                      <span className="text-sm font-bold">Page {p}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <Dialog open={isQuizOpen} onOpenChange={setIsQuizOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" title="Take a Quiz">
                <GraduationCap className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  Quick Knowledge Check
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Let's see what you've learned from this book so far!
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="font-medium mb-3">What is the main topic of the pages you just read?</p>
                  <div className="space-y-2">
                    {["Science & Nature", "History", "Math", "Reading"].map((option, i) => (
                      <button
                        key={i}
                        onClick={() => setIsQuizOpen(false)}
                        className="w-full text-left p-3 rounded-md bg-white/5 hover:bg-primary/20 transition-colors text-sm"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="w-[1px] h-6 bg-white/10 mx-1 hidden sm:block" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode(v => v === 'single' ? 'double' : 'single')}
            className="text-white hover:bg-white/10 hidden lg:flex"
          >
            {viewMode === 'double' ? <BookCopy className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/10"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Main reading area */}
      <main
        className="flex-1 flex items-center justify-center p-4 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Helper to load the document once */}
        <div className="hidden">
          <Document
            file={book.pdf_url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div />} // silent loading
            error={<div>Error loading PDF</div>}
          >
            {/* We just want the metadata here to set numPages */}
          </Document>
        </div>

        {/* Navigation arrows overlay */}
        <div
          onClick={handlePrev}
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1/6 z-10 cursor-pointer hidden md:flex items-center justify-start pl-8 group",
            currentPage <= 1 && "pointer-events-none opacity-0"
          )}
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="w-8 h-8" />
          </div>
        </div>

        <div
          onClick={handleNext}
          className={cn(
            "absolute right-0 top-0 bottom-0 w-1/6 z-10 cursor-pointer hidden md:flex items-center justify-end pr-8 group",
            currentPage >= totalPages && "pointer-events-none opacity-0"
          )}
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-8 h-8" />
          </div>
        </div>

        {/* Book container */}
        <div
          className="relative perspective-[2000px] transition-transform duration-300"
          style={{ transform: `scale(${zoom})` }}
        >
          {pages && pages.length > 0 ? (
            /* Image-based Rendering (Pre-processed by Server) */
            <div className={cn(
              "relative flex transition-all duration-700 ease-out shadow-2xl rounded-lg overflow-hidden bg-white",
              viewMode === 'double' ? "w-[600px] sm:w-[800px] md:w-[900px] lg:w-[1000px] xl:w-[1100px]" : "w-[300px] sm:w-[400px] md:w-[500px] lg:w-[550px]"
            )}>
              {/* Left/Single Page */}
              <div className={cn(
                "flex-1 relative bg-white flex items-center justify-center overflow-hidden",
                viewMode === 'double' && "border-r border-slate-200"
              )}>
                {leftPageData?.image_url ? (
                  <img
                    src={leftPageData.image_url}
                    alt={`Page ${leftPageData.page_number}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-slate-300">
                    {leftPageNum}
                  </div>
                )}
              </div>

              {/* Right Page */}
              {viewMode === 'double' && (
                <div className="flex-1 relative bg-white flex items-center justify-center overflow-hidden">
                  {rightPageData?.image_url ? (
                    <img
                      src={rightPageData.image_url}
                      alt={`Page ${rightPageData.page_number}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-slate-300">
                      {rightPageNum}
                    </div>
                  )}
                  {/* Shadow for fold */}
                  <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
                </div>
              )}
            </div>
          ) : (
            /* Client-Side PDF Rendering (Fallback) */
            <Document
              file={book.pdf_url}
              options={pdfOptions}
              className="flex justify-center items-center"
              loading={
                <div className="flex items-center text-white gap-2">
                  <Loader2 className="animate-spin w-8 h-8 text-primary" />
                  <span className="font-display text-lg">Loading Book...</span>
                </div>
              }
            >
              <div className={cn(
                "relative flex transition-all duration-700 ease-out shadow-2xl rounded-lg overflow-hidden bg-white",
                viewMode === 'double' ? "w-[600px] sm:w-[800px] md:w-[900px] lg:w-[1000px] xl:w-[1100px]" : "w-[300px] sm:w-[400px] md:w-[500px] lg:w-[550px]"
              )}>
                {/* Page 1 (Left or Single) */}
                <div
                  className={cn(
                    "flex-1 relative bg-white flex items-center justify-center overflow-hidden",
                    viewMode === 'double' && "border-r border-slate-200"
                  )}
                >
                  <Page
                    key={`page_${leftPageNum}`}
                    pageNumber={leftPageNum}
                    className="w-full h-full object-contain"
                    width={viewMode === 'double' ? 550 : 550}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-mono">
                    {leftPageNum}
                  </div>
                </div>

                {/* Page 2 (Right - Double Mode Only) */}
                {viewMode === 'double' && rightPageNum && rightPageNum <= totalPages && (
                  <div className="flex-1 relative bg-white flex items-center justify-center overflow-hidden">
                    <Page
                      key={`page_${rightPageNum}`}
                      pageNumber={rightPageNum}
                      className="w-full h-full object-contain"
                      width={550}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-mono">
                      {rightPageNum}
                    </div>
                    <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
                  </div>
                )}
              </div>
            </Document>
          )}
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full p-2 border border-white/10">
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            disabled={zoom <= 0.5}
            className="w-8 h-8 text-white hover:bg-white/10"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <div className="w-[1px] h-4 bg-white/20 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={resetZoom}
            className="w-8 h-8 text-white hover:bg-white/10"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <div className="w-[1px] h-4 bg-white/20 mx-1" />
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
      <footer className="p-6 bg-black/20 backdrop-blur-md border-t border-white/5 z-20">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-6 text-white">
            <span className="text-sm font-display font-medium min-w-[70px] bg-white/10 px-3 py-1 rounded-full">
              Page {currentPage} {viewMode === 'double' && rightPageNum && rightPageNum <= totalPages && `- ${rightPageNum}`}
            </span>

            <Slider
              value={[currentPage]}
              min={1}
              max={totalPages || 1}
              step={1}
              onValueChange={([value]) => handlePageChange(value)}
              className="flex-1"
            />

            <span className="text-sm text-white/60 font-display min-w-[40px] text-right">
              {totalPages}
            </span>
          </div>

          {/* Progress percentage & metadata */}
          <div className="flex justify-between items-center text-xs text-white/40 uppercase tracking-widest font-display">
            <span>EduFlip Library</span>
            <span className="bg-white/5 px-2 py-0.5 rounded">
              {Math.round((currentPage / (totalPages || 1)) * 100)}% complete
            </span>
            <span>Interactive PDF Reader</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
