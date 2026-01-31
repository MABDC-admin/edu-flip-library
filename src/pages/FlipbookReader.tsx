import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBook, useBookPages, useReadingProgress, useUpdateReadingProgress } from '@/hooks/useBooks';
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
  Hand,
  Printer,
  Type,
  Pencil,
  Highlighter,
  MessageSquare,
  Undo2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

// react-pdf imports
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// react-pageflip for 3D page curl animations
import HTMLFlipBook from 'react-pageflip';

// Worker is configured globally in src/lib/pdf-config.ts

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
  const [viewMode, setViewMode] = useState<'single' | 'double'>('single');
  const [flipbookDimensions, setFlipbookDimensions] = useState({ width: 400, height: 566 });
  const containerRef = useRef<HTMLDivElement>(null);
  const flipBookRef = useRef<any>(null);
  const [activeTool, setActiveTool] = useState<'hand' | 'text' | 'pencil' | 'highlighter' | 'note'>('hand');
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
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

  // Fetch annotations on mount
  useEffect(() => {
    const fetchAnnotations = async () => {
      if (!bookId) return;
      const { data } = await (supabase as any).from('book_annotations')
        .select('*')
        .eq('book_id', bookId);

      if (data) {
        setAnnotations((data as any[]).map(a => ({
          ...a,
          page: a.page_number,
          ...(a.content || {})
        })));
      }
    };
    fetchAnnotations();
  }, [bookId]);

  const saveAnnotation = async (annotation: any) => {
    if (!bookId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase as any).from('book_annotations')
      .insert([{
        book_id: bookId,
        user_id: user.id,
        page_number: annotation.page,
        type: annotation.type,
        content: {
          points: annotation.points,
          color: annotation.color,
          width: annotation.width
        }
      }])
      .select()
      .single();

    if (data) {
      setAnnotations(prev => [...prev.filter(a => !a.isLocal), {
        ...(data as any),
        page: (data as any).page_number,
        ...((data as any).content || {})
      }]);
    }
  };

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

  const startDrawing = (e: React.MouseEvent, pageNum: number) => {
    if (activeTool === 'note') {
      const text = prompt('Enter your note:');
      if (text) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        saveAnnotation({
          page: pageNum,
          type: 'note',
          points: [{ x, y }], // Center point
          color: 'blue',
          width: 0,
          text: text
        });
      }
      return;
    }
    if (activeTool !== 'pencil' && activeTool !== 'highlighter') return;
    setIsDrawing(true);
    const canvas = e.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setAnnotations(prev => [...prev, {
      page: pageNum,
      type: activeTool === 'highlighter' ? 'highlighter' : 'pencil',
      points: [{ x, y }],
      color: activeTool === 'highlighter' ? 'rgba(255, 255, 0, 0.4)' : 'red',
      width: activeTool === 'highlighter' ? 15 : 2,
      isLocal: true
    }]);
  };

  const draw = (e: React.MouseEvent, pageNum: number) => {
    if (!isDrawing || (activeTool !== 'pencil' && activeTool !== 'highlighter')) return;
    const canvas = e.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setAnnotations(prev => {
      const last = prev[prev.length - 1];
      if (!last || last.page !== pageNum) return prev;
      return [
        ...prev.slice(0, -1),
        { ...last, points: [...last.points, { x, y }] }
      ];
    });

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const lastAnnotation = annotations[annotations.length - 1];
      if (lastAnnotation && lastAnnotation.points.length > 1) {
        const p1 = lastAnnotation.points[lastAnnotation.points.length - 2];
        const p2 = lastAnnotation.points[lastAnnotation.points.length - 1];
        ctx.beginPath();
        ctx.strokeStyle = lastAnnotation.color;
        ctx.lineWidth = lastAnnotation.width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const lastAnnotation = annotations[annotations.length - 1];
      if (lastAnnotation && lastAnnotation.isLocal) {
        saveAnnotation(lastAnnotation);
      }
    }
    setIsDrawing(false);
  };

  // Redraw annotations when page or tool changes
  const redrawPage = useCallback((pageNum: number, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pageAnnotations = annotations.filter(a => a.page_number === pageNum || a.page === pageNum);

    pageAnnotations.forEach(a => {
      const content = a.content || a;
      if (a.type === 'note') {
        const p = content.points?.[0];
        if (!p) return;
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (a.type === 'pencil' || a.type === 'highlighter' || !a.type) {
        if (!content.points || content.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = content.color;
        ctx.lineWidth = content.width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.moveTo(content.points[0].x, content.points[0].y);
        for (let i = 1; i < content.points.length; i++) {
          ctx.lineTo(content.points[i].x, content.points[i].y);
        }
        ctx.stroke();
      }
    });
  }, [annotations]);

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
        "min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col transition-colors duration-500",
        isFullscreen && "bg-black"
      )}
    >
      {/* Top bar */}
      <header
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex items-center justify-between p-4 bg-black/20 backdrop-blur-md text-white z-20 transition-all duration-300",
          isMaximized && "translate-y-[-100%] absolute top-0 left-0 right-0"
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
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={cn("text-white hover:bg-white/10", !showThumbnails && "text-white/40")}
            title={showThumbnails ? "Hide Thumbnails" : "Show Thumbnails"}
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
                    className="w-full h-full object-contain pointer-events-none"
                    loading={page.page_number <= 4 ? "eager" : "lazy"}
                  />
                  {activeTool !== 'hand' && activeTool !== 'text' && (
                    <canvas
                      width={flipbookDimensions.width}
                      height={flipbookDimensions.height}
                      className="absolute inset-0 z-10 cursor-crosshair w-full h-full"
                      onMouseDown={(e) => startDrawing(e, page.page_number)}
                      onMouseMove={(e) => draw(e, page.page_number)}
                      onMouseUp={() => stopDrawing()}
                      onMouseLeave={() => stopDrawing()}
                      ref={(el) => {
                        if (el) redrawPage(page.page_number, el);
                      }}
                    />
                  )}
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
                      renderTextLayer={activeTool === 'text'}
                      renderAnnotationLayer={false}
                    />
                    {activeTool !== 'hand' && activeTool !== 'text' && (
                      <canvas
                        width={flipbookDimensions.width}
                        height={flipbookDimensions.width * 1.414}
                        className="absolute inset-0 z-10 cursor-crosshair w-full h-full"
                        onMouseDown={(e) => startDrawing(e, pageNum)}
                        onMouseMove={(e) => draw(e, pageNum)}
                        onMouseUp={() => stopDrawing()}
                        onMouseLeave={() => stopDrawing()}
                        ref={(el) => {
                          if (el) redrawPage(pageNum, el);
                        }}
                      />
                    )}
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

      {/* NEW: Horizontal SVG Thumbnail Strip */}
      {showThumbnails && !isMaximized && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="bg-black/30 backdrop-blur-md py-4 border-t border-white/5 overflow-x-auto scrollbar-hide z-20"
        >
          <div className="flex gap-4 px-6 mx-auto w-max">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const pageData = pages?.find(pd => pd.page_number === p);
              return (
                <button
                  key={`strip-${p}`}
                  onClick={() => goToPage(p)}
                  className={cn(
                    "relative h-20 aspect-[3/4] rounded bg-slate-800 hover:bg-slate-700 transition-all overflow-hidden border border-white/10 shrink-0 group",
                    currentPage === p ? "ring-2 ring-primary scale-105 z-10" : "opacity-60 hover:opacity-100"
                  )}
                >
                  {pageData?.svg_url || pageData?.thumbnail_url ? (
                    <img
                      src={(pageData.svg_url || pageData.thumbnail_url) as string}
                      alt={`Page ${p}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-[10px] text-slate-500 font-bold">
                      {p}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* NEW: Advanced Control Bar */}
      {!isMaximized && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="bg-black/20 backdrop-blur-md py-2 border-t border-white/5 flex items-center justify-center gap-2 flex-wrap sm:gap-4 px-4 z-20"
        >
          <div className="flex items-center bg-white/5 rounded-full p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveTool('hand')}
              className={cn("w-8 h-8 rounded-full transition-colors", activeTool === 'hand' ? "bg-primary text-white" : "text-white/60 hover:text-white")}
              title="Hand Tool"
            >
              <Hand className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveTool('text')}
              className={cn("w-8 h-8 rounded-full transition-colors", activeTool === 'text' ? "bg-primary text-white" : "text-white/60 hover:text-white")}
              title="Text Selection"
            >
              <Type className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveTool('pencil')}
              className={cn("w-8 h-8 rounded-full transition-colors", activeTool === 'pencil' ? "bg-primary text-white" : "text-white/60 hover:text-white")}
              title="Pencil Tool"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveTool('highlighter')}
              className={cn("w-8 h-8 rounded-full transition-colors", activeTool === 'highlighter' ? "bg-primary text-white" : "text-white/60 hover:text-white")}
              title="Highlighter"
            >
              <Highlighter className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveTool('note')}
              className={cn("w-8 h-8 rounded-full transition-colors", activeTool === 'note' ? "bg-primary text-white" : "text-white/60 hover:text-white")}
              title="Add Note"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          </div>

          <div className="w-[1px] h-6 bg-white/10 mx-1" />

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomOut}
              disabled={zoom <= 0.5}
              className="w-8 h-8 text-white hover:bg-white/10"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-[10px] text-white/60 font-mono w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
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

          <div className="w-[1px] h-6 bg-white/10 mx-1" />

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
            className="w-8 h-8 text-white hover:bg-white/10"
            title="Print PDF"
          >
            <Printer className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAnnotations([])}
            className="w-8 h-8 text-white hover:bg-white/10"
            title="Clear Annotations"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
        </div>
      )}

    </div>
  );
}
