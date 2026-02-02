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
import { useAuth } from '@/contexts/AuthContext';

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
}

const FlipPage = forwardRef<HTMLDivElement, FlipPageProps>(({ children, pageNumber }, ref) => {
  return (
    <div ref={ref} className="relative bg-white w-full h-full flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.2)]">
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

  useEffect(() => {
    if (book && user && !notificationSentRef.current) {
      notificationSentRef.current = true;
      supabase.functions.invoke('notify-admin', {
        body: {
          type: 'read',
          user_email: user.email,
          user_role: role || 'student',
          book_title: book.title,
        }
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
      flipBookRef.current.pageFlip().turnToPage(page - 1);
    }
  }, []);

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
        className={cn("flex-1 flex items-center justify-center relative overflow-hidden", !isMaximized && "p-4")}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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

        <div
          className="relative transition-transform duration-300 z-10"
          style={{ transform: `scale(${zoom})` }}
        >
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
        onZoomIn={() => setZoom((z) => Math.min(z + 0.25, 3))}
        onZoomOut={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
        pdfUrl={pdfUrl}
        isVisible={!isMaximized}
      />
    </div>
  );
}
