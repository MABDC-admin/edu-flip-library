import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBook, useBookPages } from '@/hooks/useBooks';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
// import { useAuth } from '@/contexts/AuthContext'; // Paused for email notifications

// react-pdf imports
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// react-pageflip for 3D page curl animations
import HTMLFlipBook from 'react-pageflip';

// Refactored components
import { AmbientBackground } from '@/components/reader/AmbientBackground';
import { ReaderHeader } from '@/components/reader/ReaderHeader';
import { ReaderControls } from '@/components/reader/ReaderControls';
import { ThumbnailGrid } from '@/components/reader/ThumbnailGrid';
import { AnnotationToolbar } from '@/components/reader/AnnotationToolbar';
import { AnnotationCanvas } from '@/components/reader/AnnotationCanvas';
import { useAnnotations } from '@/hooks/useAnnotations';

const pdfOptions = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  disableRange: false,
  disableStream: false,
  disableAutoFetch: true,
};

interface FlipPageProps {
  children: React.ReactNode;
  pageNumber: number;
  annotationOverlay?: React.ReactNode;
}

const FlipPage = forwardRef<HTMLDivElement, FlipPageProps>(({ children, pageNumber, annotationOverlay }, ref) => {
  return (
    <div ref={ref} className="relative bg-white w-full h-full flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.2)]">
      <div className="absolute right-0 top-0 bottom-0 w-[4px] bg-gradient-to-l from-black/10 to-transparent z-10" />
      <div className="absolute right-[4px] top-0 bottom-0 w-[1px] bg-black/5 z-10" />
      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-r from-black/10 to-transparent z-10" />
      <div className="absolute left-[4px] top-0 bottom-0 w-[1px] bg-black/5 z-10" />

      {children}
      {annotationOverlay}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-mono select-none z-30">
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
  // Email notifications paused - auth/role tracking removed

  const getInitialZoom = () => {
    if (typeof window === 'undefined') return 1.75;
    const width = window.innerWidth;
    if (width < 768) return 1.5;      // Mobile: 150%
    if (width < 1024) return 1.75;    // Tablet: 175%
    return 2.0;                        // Desktop: 200%
  };

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(getInitialZoom);
  const userChangedZoom = useRef(false);
  const [viewMode, setViewMode] = useState<'single' | 'double'>('single');
  const [flipbookDimensions, setFlipbookDimensions] = useState({ width: 400, height: 566 });
  const containerRef = useRef<HTMLDivElement>(null);
  const flipBookRef = useRef<any>(null);
  const [showThumbnailGrid, setShowThumbnailGrid] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Pan & zoom state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Annotation system
  const annotationState = useAnnotations();
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [selectedSticker, setSelectedSticker] = useState('');
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const hasAnnotations = Object.values(annotationState.annotations).some(
    (pageAnnotations) => pageAnnotations.length > 0
  );

  // Handles closing annotation mode with optional confirmation
  const handleCloseAnnotationMode = useCallback(() => {
    if (hasAnnotations) {
      setShowCloseDialog(true);
    } else {
      annotationState.toggleAnnotationMode();
    }
  }, [hasAnnotations, annotationState]);

  const confirmCloseAnnotations = useCallback(() => {
    annotationState.clearAllAnnotations();
    annotationState.toggleAnnotationMode();
    setShowCloseDialog(false);
  }, [annotationState]);

  const keepAndClose = useCallback(() => {
    annotationState.toggleAnnotationMode();
    setShowCloseDialog(false);
  }, [annotationState]);

  useEffect(() => {
    const calculateDimensions = () => {
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      const isDesktop = window.innerWidth >= 1024;

      let pageWidth: number;
      let pageHeight: number;

      if (isMobile) {
        pageWidth = Math.min(window.innerWidth - 32, 400);
        pageHeight = pageWidth * 1.414;
      } else if (isTablet) {
        pageWidth = Math.min((window.innerWidth - 64) / 2, 350);
        pageHeight = pageWidth * 1.414;
      } else {
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

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

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

  const onFlip = useCallback((e: { data: number }) => {
    const newPage = e.data + 1;
    setCurrentPage(newPage);
    playFlipSound();
  }, []);

  const handleNext = useCallback(() => {
    if (annotationState.isAnnotationMode) {
      setCurrentPage((p) => Math.min(p + 1, totalPages));
    } else if (flipBookRef.current?.pageFlip()) {
      flipBookRef.current.pageFlip().flipNext();
    }
  }, [annotationState.isAnnotationMode, totalPages]);

  const handlePrev = useCallback(() => {
    if (annotationState.isAnnotationMode) {
      setCurrentPage((p) => Math.max(p - 1, 1));
    } else if (flipBookRef.current?.pageFlip()) {
      flipBookRef.current.pageFlip().flipPrev();
    }
  }, [annotationState.isAnnotationMode]);

  const goToPage = useCallback((page: number) => {
    if (annotationState.isAnnotationMode) {
      setCurrentPage(page);
    } else if (flipBookRef.current?.pageFlip()) {
      flipBookRef.current.pageFlip().turnToPage(page - 1);
    }
  }, [annotationState.isAnnotationMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Spacebar: hold to pan (prevent default scroll)
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) {
          setIsSpaceHeld(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'Escape':
          if (annotationState.isAnnotationMode) {
            handleCloseAnnotationMode();
          } else if (showThumbnailGrid) {
            setShowThumbnailGrid(false);
          } else if (isFullscreen) {
            document.exitFullscreen();
          } else {
            navigate(-1);
          }
          break;
        // Reset pan to center
        case '0':
          setPanOffset({ x: 0, y: 0 });
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        setIsSpaceHeld(false);
        isPanningRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleNext, handlePrev, isFullscreen, navigate, showThumbnailGrid, annotationState.isAnnotationMode, handleCloseAnnotationMode]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Update zoom on resize only if user hasn't manually adjusted
  useEffect(() => {
    const handleResize = () => {
      if (!userChangedZoom.current) {
        const width = window.innerWidth;
        if (width < 768) setZoom(1.5);
        else if (width < 1024) setZoom(1.75);
        else setZoom(2.0);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll-to-zoom handler on the main viewing area
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Only zoom if Ctrl/Meta is held or pinch gesture (ctrlKey for trackpad pinch)
      // Otherwise let normal scroll happen for accessibility
      e.preventDefault();
      const delta = -e.deltaY;
      const zoomStep = 0.08;
      const change = delta > 0 ? zoomStep : -zoomStep;

      setZoom((prev) => {
        const next = Math.round(Math.max(0.5, Math.min(4, prev + change)) * 100) / 100;
        return next;
      });
      userChangedZoom.current = true;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Spacebar + drag to pan
  const handlePanPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isSpaceHeld) return;
    e.preventDefault();
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panOffsetStartRef.current = { ...panOffset };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [isSpaceHeld, panOffset]);

  const handlePanPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPanOffset({
      x: panOffsetStartRef.current.x + dx,
      y: panOffsetStartRef.current.y + dy,
    });
  }, []);

  const handlePanPointerUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  // Reset pan when zoom returns to 1 or below
  useEffect(() => {
    if (zoom <= 1) {
      setPanOffset({ x: 0, y: 0 });
    }
  }, [zoom]);

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

  // Helper to render annotation canvas overlay for a page
  const renderAnnotationOverlay = (pageNum: number) => (
    <AnnotationCanvas
      pageNumber={pageNum}
      annotations={annotationState.getPageAnnotations(pageNum)}
      activeTool={annotationState.activeTool}
      activeColor={annotationState.activeColor}
      strokeWidth={annotationState.strokeWidth}
      fontSize={annotationState.fontSize}
      isAnnotationMode={annotationState.isAnnotationMode}
      selectedEmoji={selectedEmoji}
      selectedSticker={selectedSticker}
      selectedAnnotationId={annotationState.selectedAnnotationId}
      onSelectAnnotation={annotationState.setSelectedAnnotationId}
      onCreateDrawing={annotationState.createDrawing}
      onCreateText={annotationState.createTextAnnotation}
      onCreateNote={annotationState.createNote}
      onCreateEmoji={annotationState.createEmoji}
      onCreateSticker={annotationState.createSticker}
      onUpdateAnnotation={annotationState.updateAnnotation}
      onRemoveAnnotation={annotationState.removeAnnotation}
      width={flipbookDimensions.width}
      height={flipbookDimensions.height}
    />
  );

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
      <AmbientBackground isFullscreen={isFullscreen} />

      <ReaderHeader
        title={book.title}
        onBack={() => navigate('/bookshelf')}
        onShowThumbnails={() => setShowThumbnailGrid(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isMaximized={isMaximized}
        onToggleMaximize={() => setIsMaximized(!isMaximized)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      <main
        ref={mainRef}
        className={cn(
          "flex-1 flex items-center justify-center relative overflow-hidden",
          !isMaximized && "p-4",
          isSpaceHeld && !isPanningRef.current && "cursor-grab",
          isSpaceHeld && isPanningRef.current && "cursor-grabbing",
        )}
        onTouchStart={!annotationState.isAnnotationMode ? handleTouchStart : undefined}
        onTouchEnd={!annotationState.isAnnotationMode ? handleTouchEnd : undefined}
        onPointerDown={handlePanPointerDown}
        onPointerMove={handlePanPointerMove}
        onPointerUp={handlePanPointerUp}
        onPointerCancel={handlePanPointerUp}
      >
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

        {/* Static navigation arrows -- always visible */}
        <div
          onClick={handlePrev}
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 w-16 h-16 z-10 cursor-pointer hidden md:flex items-center justify-center group",
            currentPage <= 1 && "pointer-events-none opacity-0"
          )}
        >
          <div className={cn(
            "w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all duration-300 hover:scale-110 hover:bg-black/60 hover:border-white/20 shadow-xl",
            annotationState.isAnnotationMode ? "opacity-80" : "opacity-0 group-hover:opacity-100"
          )}>
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
          <div className={cn(
            "w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all duration-300 hover:scale-110 hover:bg-black/60 hover:border-white/20 shadow-xl",
            annotationState.isAnnotationMode ? "opacity-80" : "opacity-0 group-hover:opacity-100"
          )}>
            <ChevronRight className="w-8 h-8" />
          </div>
        </div>

        <div
          className={cn(
            "relative z-10",
            !isPanningRef.current && "transition-transform duration-300"
          )}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          }}
        >
          {/* ===== ANNOTATION MODE: Static single-page view (no flip animation) ===== */}
          {annotationState.isAnnotationMode ? (
            <div
              className="relative shadow-2xl"
              style={{ width: flipbookDimensions.width, height: flipbookDimensions.height }}
            >
              {flipbookPages && flipbookPages.length > 0 ? (
                (() => {
                  const page = flipbookPages.find((p) => p.page_number === currentPage) || flipbookPages[0];
                  return (
                    <FlipPage pageNumber={page.page_number} annotationOverlay={renderAnnotationOverlay(page.page_number)}>
                      <img
                        src={page.svg_url || page.image_url}
                        alt={`Page ${page.page_number}`}
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    </FlipPage>
                  );
                })()
              ) : totalPages > 0 ? (
                <Document
                  file={(pdfUrl as any) || undefined}
                  options={pdfOptions}
                  onLoadSuccess={onDocumentLoadSuccess}
                >
                  <FlipPage pageNumber={currentPage} annotationOverlay={renderAnnotationOverlay(currentPage)}>
                    <Page
                      pageNumber={currentPage}
                      width={flipbookDimensions.width}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </FlipPage>
                </Document>
              ) : (
                <div className="flex items-center justify-center w-full h-full text-white gap-2">
                  <Loader2 className="animate-spin w-8 h-8 text-primary" />
                  <span className="font-display text-lg">Loading...</span>
                </div>
              )}

              {/* Page indicator for static mode */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-white/50 font-mono whitespace-nowrap">
                {currentPage} / {totalPages}
              </div>
            </div>
          ) : (
            /* ===== NORMAL MODE: Flipbook with page curl animation ===== */
            <>
              {viewMode === 'double' && (
                <div className="absolute left-1/2 top-4 bottom-4 w-12 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/15 to-transparent z-[5] pointer-events-none blur-[4px]" />
              )}

              {flipbookPages && flipbookPages.length > 0 ? (
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
                    <FlipPage key={page.id} pageNumber={page.page_number} annotationOverlay={renderAnnotationOverlay(page.page_number)}>
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
                      <FlipPage key={`pdf-page-${pageNum}`} pageNumber={pageNum} annotationOverlay={renderAnnotationOverlay(pageNum)}>
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
            </>
          )}
        </div>
      </main>

      <ThumbnailGrid
        isOpen={showThumbnailGrid}
        onClose={() => setShowThumbnailGrid(false)}
        totalPages={totalPages}
        currentPage={currentPage}
        onPageSelect={(p) => {
          goToPage(p);
          setShowThumbnailGrid(false);
        }}
        pages={pages || null}
      />

      <ReaderControls
        zoom={zoom}
        onZoomIn={() => {
          userChangedZoom.current = true;
          setZoom((z) => Math.min(z + 0.25, 4));
        }}
        onZoomOut={() => {
          userChangedZoom.current = true;
          setZoom((z) => Math.max(z - 0.25, 0.5));
        }}
        onResetView={() => {
          setPanOffset({ x: 0, y: 0 });
          setZoom(getInitialZoom());
          userChangedZoom.current = false;
        }}
        isPanned={panOffset.x !== 0 || panOffset.y !== 0}
        pdfUrl={pdfUrl}
        isVisible={!isMaximized}
      />

      {/* Annotation Toolbar */}
      <AnnotationToolbar
        activeTool={annotationState.activeTool}
        onToolChange={annotationState.setActiveTool}
        activeColor={annotationState.activeColor}
        onColorChange={annotationState.setActiveColor}
        strokeWidth={annotationState.strokeWidth}
        onStrokeWidthChange={annotationState.setStrokeWidth}
        fontSize={annotationState.fontSize}
        onFontSizeChange={annotationState.setFontSize}
        isAnnotationMode={annotationState.isAnnotationMode}
        onToggleAnnotationMode={annotationState.toggleAnnotationMode}
        onCloseAnnotationMode={handleCloseAnnotationMode}
        onClearPage={() => annotationState.clearPageAnnotations(currentPage)}
        onClearAll={annotationState.clearAllAnnotations}
        onEmojiSelect={setSelectedEmoji}
        onStickerSelect={setSelectedSticker}
        selectedEmoji={selectedEmoji}
        selectedSticker={selectedSticker}
      />

      {/* Close Annotation Confirmation Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent className="bg-slate-900 border-white/15 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Close Annotation Tools?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              You have annotations on your pages. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel
              onClick={() => setShowCloseDialog(false)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={keepAndClose}
              className="bg-primary hover:bg-primary/80"
            >
              Keep & Close
            </AlertDialogAction>
            <AlertDialogAction
              onClick={confirmCloseAnnotations}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Discard All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
