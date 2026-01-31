import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
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

// react-pageflip for 3D page curl animations
import HTMLFlipBook from 'react-pageflip';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

// Optimize PDF loading options
const pdfOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  disableRange: false,
  disableStream: false,
  disableAutoFetch: true,
};

// Forward ref wrapper for flipbook pages (required by react-pageflip)
interface FlipPageProps {
  children: React.ReactNode;
  pageNumber: number;
}

const FlipPage = forwardRef<HTMLDivElement, FlipPageProps>(({ children, pageNumber }, ref) => {
  return (
    <div ref={ref} className="relative bg-white w-full h-full flex items-center justify-center overflow-hidden">
      {children}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-mono">
        {pageNumber}
      </div>
    </div>
  );
});
FlipPage.displayName = 'FlipPage';

export default function FlipbookReader() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const { data: book, isLoading: bookLoading } = useBook(bookId);
  const { data: pages } = useBookPages(bookId);
  const { data: progress } = useReadingProgress(bookId);
  const updateProgress = useUpdateReadingProgress();

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'double'>('single');
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [flipbookDimensions, setFlipbookDimensions] = useState({ width: 400, height: 566 });
  const containerRef = useRef<HTMLDivElement>(null);
  const flipBookRef = useRef<any>(null);

  // Calculate flipbook dimensions based on viewport and mode
  useEffect(() => {
    const calculateDimensions = () => {
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      const isDesktop = window.innerWidth >= 1024;

      let pageWidth: number;
      let pageHeight: number;

      if (isMobile) {
        // Mobile: single page, nearly full width
        pageWidth = Math.min(window.innerWidth - 32, 400);
        pageHeight = pageWidth * 1.414; // A4 aspect ratio
      } else if (isTablet) {
        // Tablet: slightly larger
        pageWidth = Math.min((window.innerWidth - 64) / 2, 350);
        pageHeight = pageWidth * 1.414;
      } else {
        // Desktop: larger pages
        pageWidth = Math.min((window.innerWidth - 200) / 2, 500);
        pageHeight = Math.min(window.innerHeight - 200, pageWidth * 1.414);
      }

      setFlipbookDimensions({ width: Math.round(pageWidth), height: Math.round(pageHeight) });
      setViewMode(isDesktop ? 'double' : 'single');
    };

    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);
    return () => window.removeEventListener('resize', calculateDimensions);
  }, []);

  // Initialize from saved progress
  useEffect(() => {
    if (progress?.current_page) {
      setCurrentPage(progress.current_page);
      // Flip to saved page after flipbook initializes
      setTimeout(() => {
        if (flipBookRef.current?.pageFlip()) {
          flipBookRef.current.pageFlip().turnToPage(progress.current_page - 1);
        }
      }, 500);
    }
  }, [progress]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Save progress on page change
  const saveProgress = useCallback((page: number) => {
    if (!bookId || !book) return;
    const totalPagesCount = numPages || book.page_count || 1;
    const completed = page >= totalPagesCount;
    updateProgress.mutate({ bookId, currentPage: page, completed });
  }, [bookId, book, numPages, updateProgress]);

  // Debounced progress save
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveProgress(currentPage);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [currentPage, saveProgress]);

  const totalPages = numPages || book?.page_count || pages?.length || 0;

  const playFlipSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => { });
  };

  // Handle page flip from react-pageflip
  const onFlip = useCallback((e: any) => {
    const newPage = e.data + 1; // react-pageflip uses 0-indexed pages
    setCurrentPage(newPage);
    playFlipSound();
  }, []);

  const handleNext = useCallback(() => {
    if (flipBookRef.current?.pageFlip()) {
      flipBookRef.current.pageFlip().flipNext();
    }
  }, []);

  const handlePrev = useCallback(() => {
    if (flipBookRef.current?.pageFlip()) {
      flipBookRef.current.pageFlip().flipPrev();
    }
  }, []);

  const goToPage = useCallback((page: number) => {
    if (flipBookRef.current?.pageFlip()) {
      flipBookRef.current.pageFlip().turnToPage(page - 1); // 0-indexed
    }
  }, []);

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
  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 2));
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

  // Prepare page data for the flipbook
  const flipbookPages = pages && pages.length > 0
    ? [...pages].sort((a, b) => a.page_number - b.page_number)
    : null;
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
          {/* Thumbnails Sheet */}
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
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    const pageData = pages?.find(pd => pd.page_number === p);
                    return (
                      <button
                        key={p}
                        onClick={() => {
                          goToPage(p);
                          setShowThumbnails(false);
                        }}
                        className={cn(
                          "relative aspect-[3/4] rounded-md bg-slate-800 hover:bg-slate-700 transition-all overflow-hidden group",
                          currentPage === p ? "ring-2 ring-primary scale-95" : ""
                        )}
                      >
                        {pageData?.thumbnail_url ? (
                          <img
                            src={pageData.thumbnail_url}
                            alt={`Page ${p}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-slate-500 font-bold">
                            {p}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-xs font-bold text-white">Page {p}</span>
                        </div>
                      </button>
                    );
                  })}
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
        {/* Hidden document loader for page count */}
        {!flipbookPages && (
          <div className="hidden">
            <Document
              file={book.pdf_url}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div />}
              error={<div>Error loading PDF</div>}
            />
          </div>
        )}

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

        {/* Flipbook container with zoom */}
        <div
          className="relative transition-transform duration-300"
          style={{ transform: `scale(${zoom})` }}
        >
          {flipbookPages && flipbookPages.length > 0 ? (
            /* Image-based flipbook using react-pageflip */
            <HTMLFlipBook
              ref={flipBookRef}
              width={flipbookDimensions.width}
              height={flipbookDimensions.height}
              size="stretch"
              minWidth={300}
              maxWidth={600}
              minHeight={424}
              maxHeight={848}
              showCover={true}
              mobileScrollSupport={true}
              onFlip={onFlip}
              className="shadow-2xl"
              style={{}}
              startPage={0}
              drawShadow={true}
              flippingTime={600}
              usePortrait={viewMode === 'single'}
              startZIndex={0}
              autoSize={true}
              maxShadowOpacity={0.5}
              showPageCorners={true}
              disableFlipByClick={false}
              swipeDistance={30}
              clickEventForward={true}
              useMouseEvents={true}
            >
              {flipbookPages.map((page) => (
                <FlipPage key={page.id} pageNumber={page.page_number}>
                  <img
                    src={page.svg_url || page.image_url}
                    alt={`Page ${page.page_number}`}
                    className="w-full h-full object-contain"
                    loading={page.page_number <= 4 ? "eager" : "lazy"}
                  />
                </FlipPage>
              ))}
            </HTMLFlipBook>
          ) : totalPages > 0 ? (
            /* PDF-based flipbook fallback */
            <Document
              file={book.pdf_url}
              options={pdfOptions}
              className="flex justify-center items-center"
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center text-white gap-2">
                  <Loader2 className="animate-spin w-8 h-8 text-primary" />
                  <span className="font-display text-lg">Loading Book...</span>
                </div>
              }
            >
              <HTMLFlipBook
                ref={flipBookRef}
                width={flipbookDimensions.width}
                height={flipbookDimensions.height}
                size="stretch"
                minWidth={300}
                maxWidth={600}
                minHeight={424}
                maxHeight={848}
                showCover={true}
                mobileScrollSupport={true}
                onFlip={onFlip}
                className="shadow-2xl"
                style={{}}
                startPage={0}
                drawShadow={true}
                flippingTime={600}
                usePortrait={viewMode === 'single'}
                startZIndex={0}
                autoSize={true}
                maxShadowOpacity={0.5}
                showPageCorners={true}
                disableFlipByClick={false}
                swipeDistance={30}
                clickEventForward={true}
                useMouseEvents={true}
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <FlipPage key={`pdf-page-${pageNum}`} pageNumber={pageNum}>
                    <Page
                      pageNumber={pageNum}
                      width={flipbookDimensions.width}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </FlipPage>
                ))}
              </HTMLFlipBook>
            </Document>
          ) : (
            <div className="flex items-center text-white gap-2">
              <Loader2 className="animate-spin w-8 h-8 text-primary" />
              <span className="font-display text-lg">Loading Book...</span>
            </div>
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
            disabled={zoom >= 2}
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
              Page {currentPage} {viewMode === 'double' && totalPages > 1 && currentPage < totalPages && `- ${Math.min(currentPage + 1, totalPages)}`}
            </span>

            <Slider
              value={[currentPage]}
              min={1}
              max={totalPages || 1}
              step={1}
              onValueChange={([value]) => goToPage(value)}
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
            <span>Interactive Flipbook</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
