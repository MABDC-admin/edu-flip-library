import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBook, useBookPages } from '@/hooks/useBooks';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  BookOpen,
  Square,
  LayoutGrid,
  Monitor,
  Loader2,
  Printer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// react-pdf imports
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// react-pageflip for 3D page curl animations
import HTMLFlipBook from 'react-pageflip';

// Worker is configured globally in src/lib/pdf-config.ts

// PDF loading options used by Document component
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
    <div ref={ref} className="relative bg-white w-full h-full flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.2)]">
      {/* Paper Depth / Stacking Effect */}
      <div className="absolute right-0 top-0 bottom-0 w-[4px] bg-gradient-to-l from-black/10 to-transparent z-10" />
      <div className="absolute right-[4px] top-0 bottom-0 w-[1px] bg-black/5 z-10" />
      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-r from-black/10 to-transparent z-10" />
      <div className="absolute left-[4px] top-0 bottom-0 w-[1px] bg-black/5 z-10" />

      {children}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-mono select-none">
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
  const { user, role } = useAuth();
  const notificationSentRef = useRef(false);

  // Notify admin when book is accessed
  useEffect(() => {
    if (book && user && !notificationSentRef.current) {
      notificationSentRef.current = true;
      console.log('Book accessed, invoking notify-admin...', { book: book.title, user: user.email });
      supabase.functions.invoke('notify-admin', {
        body: {
          type: 'read',
          user_email: user.email,
          user_role: role || 'student',
          book_title: book.title,
        }
      }).then(({ data, error }) => {
        if (error) console.error('Failed to invoke notify-admin on read:', error);
        else console.log('notify-admin response (read):', data);
      }).catch(console.error);
    }
  }, [book, user, role]);

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(2.0);
  const [viewMode, setViewMode] = useState<'single' | 'double'>('single');
  const [flipbookDimensions, setFlipbookDimensions] = useState({ width: 400, height: 566 });
  const containerRef = useRef<HTMLDivElement>(null);
  const flipBookRef = useRef<any>(null);
  const [showThumbnailGrid, setShowThumbnailGrid] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

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

  // Fetch pages and reading progress hooks are already active via react-query



  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }


  // Resolve the full PDF URL for react-pdf
  const pdfUrl = book?.pdf_url ? supabase.storage.from('pdf-uploads').getPublicUrl(book.pdf_url).data.publicUrl : null;

  const totalPages = Math.max(
    numPages || 0,
    book?.page_count || 0,
    pages?.length || 0
  );

  const playFlipSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => { });
  };

  // Handle page flip from react-pageflip
  const onFlip = useCallback((e: { data: number }) => {
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
          if (showThumbnailGrid) {
            setShowThumbnailGrid(false);
          } else if (isFullscreen) {
            document.exitFullscreen();
          } else {
            navigate(-1);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isFullscreen, navigate, showThumbnailGrid]);

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
        "min-h-screen relative flex flex-col transition-colors duration-500 overflow-hidden bg-slate-900",
        isFullscreen && "bg-black"
      )}
    >
      {/* Ambient Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-[-10%] opacity-40 blur-[100px] animate-pulse pointer-events-none transition-all duration-1000"
          style={{
            background: `radial-gradient(circle at 20% 30%, #3b82f6 0%, transparent 50%), 
                         radial-gradient(circle at 80% 70%, #8b5cf6 0%, transparent 50%),
                         radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)`
          }}
        />
      </div>
      {/* Floating Header */}
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
            onClick={() => navigate('/bookshelf')}
            className="text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>

          <div className="hidden sm:block">
            <h1 className="font-display font-semibold text-lg truncate max-w-[200px] xl:max-w-[400px]">
              {book.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Thumbnail Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowThumbnailGrid(true)}
            className={cn("text-white hover:bg-white/10", showThumbnailGrid && "text-primary")}
            title="Show Thumbnails"
          >
            <LayoutGrid className="w-5 h-5" />
          </Button>

          <div className="w-[1px] h-6 bg-white/10 mx-1" />

          {/* View Mode Switcher */}
          <div className="flex items-center bg-white/5 rounded-full p-1 mr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('single')}
              className={cn("w-8 h-8 rounded-full transition-colors", viewMode === 'single' ? "bg-primary text-white" : "text-white/40 hover:text-white")}
              title="Single Page"
            >
              <Square className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('double')}
              className={cn("w-8 h-8 rounded-full transition-colors", viewMode === 'double' ? "bg-primary text-white" : "text-white/40 hover:text-white")}
              title="Double Page"
            >
              <BookOpen className="w-4 h-4" />
            </Button>
          </div>

          <div className="w-[1px] h-6 bg-white/10 mx-1 hidden sm:block" />

          {/* Theater / Maximize Mode */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMaximized(!isMaximized)}
            className={cn("text-white hover:bg-white/10", isMaximized && "text-primary")}
            title={isMaximized ? "Exit Theater Mode" : "Theater Mode"}
          >
            <Monitor className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/10"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      <main
        className={cn("flex-1 flex items-center justify-center relative overflow-hidden", !isMaximized && "p-4")}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Hidden document loader for page count */}
        {!flipbookPages && (
          <div className="hidden">
            <Document
              file={(pdfUrl as any) || undefined}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div />}
              error={<div>Error loading PDF</div>}
              options={pdfOptions}
            />
          </div>
        )}

        {/* Navigation arrows overlay */}
        <div
          onClick={handlePrev}
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 w-16 h-16 z-10 cursor-pointer hidden md:flex items-center justify-center group",
            currentPage <= 1 && "pointer-events-none opacity-0"
          )}
        >
          <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:bg-black/60 hover:border-white/20 shadow-xl">
            <ChevronLeft className="w-8 h-8" />
          </div>
        </div>

        <div
          onClick={handleNext}
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 z-10 cursor-pointer hidden md:flex items-center justify-center group",
            currentPage >= totalPages && "pointer-events-none opacity-0"
          )}
        >
          <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:bg-black/60 hover:border-white/20 shadow-xl">
            <ChevronRight className="w-8 h-8" />
          </div>
        </div>

        {/* Flipbook container with zoom and spinal effects */}
        <div
          className="relative transition-transform duration-300 z-10"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Central spine shadow overlay */}
          {viewMode === 'double' && (
            <div className="absolute left-1/2 top-4 bottom-4 w-12 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/15 to-transparent z-[5] pointer-events-none blur-[4px]" />
          )}

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
              flippingTime={800}
              usePortrait={viewMode === 'single'}
              startZIndex={0}
              autoSize={true}
              maxShadowOpacity={0.6}
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
                    className="w-full h-full object-contain pointer-events-none"
                    loading={page.page_number <= 4 ? "eager" : "lazy"}
                  />
                </FlipPage>
              ))}
            </HTMLFlipBook>
          ) : totalPages > 0 ? (
            /* PDF-based flipbook fallback */
            <Document
              file={(pdfUrl as any) || undefined}
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
                flippingTime={800}
                usePortrait={viewMode === 'single'}
                startZIndex={0}
                autoSize={true}
                maxShadowOpacity={0.6}
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
                      renderTextLayer={true}
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

      </main>

      {isMaximized && (
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setIsMaximized(false); }}
          className="fixed top-4 right-4 z-50 rounded-full shadow-lg bg-black/40 backdrop-blur-md text-white hover:bg-black/60 border border-white/10"
        >
          <Monitor className="w-4 h-4 mr-2" />
          Exit Theater Mode
        </Button>
      )}

      {/* Full-Page Thumbnail Grid Overlay */}
      {showThumbnailGrid && (
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
              onClick={() => setShowThumbnailGrid(false)}
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
                    onClick={() => {
                      goToPage(p);
                      setShowThumbnailGrid(false);
                    }}
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
      )}

      {/* NEW: Advanced Control Bar */}
      {!isMaximized && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-2xl py-2 px-6 rounded-full border border-white/20 flex items-center justify-center gap-4 z-50 shadow-[0_8px_32px_rgba(37,99,235,0.2)] transition-all hover:bg-black/80 hover:scale-105 hover:border-white/30"
        >
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomOut}
              disabled={zoom <= 0.5}
              className="w-8 h-8 text-white hover:bg-white/10 rounded-full"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-[10px] text-white/80 font-mono w-12 text-center font-bold">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomIn}
              disabled={zoom >= 3}
              className="w-8 h-8 text-white hover:bg-white/10 rounded-full"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

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
      )}
    </div>
  );
}
