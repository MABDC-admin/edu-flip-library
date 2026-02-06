import { useState, useCallback } from 'react';
import type {
  Annotation,
  AnnotationTool,
  DrawingAnnotation,
  TextAnnotation,
  NoteAnnotation,
  EmojiAnnotation,
  StickerAnnotation,
  Point,
} from '@/types/annotations';

function generateId() {
  return `ann_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Record<number, Annotation[]>>({});
  const [activeTool, setActiveTool] = useState<AnnotationTool>('select');
  const [activeColor, setActiveColor] = useState('#3b82f6');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fontSize, setFontSize] = useState(16);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  const getPageAnnotations = useCallback(
    (pageNumber: number): Annotation[] => {
      return annotations[pageNumber] || [];
    },
    [annotations]
  );

  const addAnnotation = useCallback((pageNumber: number, annotation: Annotation) => {
    setAnnotations((prev) => ({
      ...prev,
      [pageNumber]: [...(prev[pageNumber] || []), annotation],
    }));
  }, []);

  const updateAnnotation = useCallback(
    (pageNumber: number, annotationId: string, updates: Partial<Annotation>) => {
      setAnnotations((prev) => ({
        ...prev,
        [pageNumber]: (prev[pageNumber] || []).map((a) =>
          a.id === annotationId ? { ...a, ...updates } : a
        ),
      }));
    },
    []
  );

  const removeAnnotation = useCallback((pageNumber: number, annotationId: string) => {
    setAnnotations((prev) => ({
      ...prev,
      [pageNumber]: (prev[pageNumber] || []).filter((a) => a.id !== annotationId),
    }));
  }, []);

  const clearPageAnnotations = useCallback((pageNumber: number) => {
    setAnnotations((prev) => {
      const next = { ...prev };
      delete next[pageNumber];
      return next;
    });
  }, []);

  const clearAllAnnotations = useCallback(() => {
    setAnnotations({});
  }, []);

  const createDrawing = useCallback(
    (pageNumber: number, points: Point[], tool: 'pen' | 'highlighter'): DrawingAnnotation => {
      const annotation: DrawingAnnotation = {
        id: generateId(),
        type: 'drawing',
        tool,
        points,
        color: activeColor,
        strokeWidth: tool === 'highlighter' ? strokeWidth * 4 : strokeWidth,
        opacity: tool === 'highlighter' ? 0.35 : 1,
        pageNumber,
      };
      addAnnotation(pageNumber, annotation);
      return annotation;
    },
    [activeColor, strokeWidth, addAnnotation]
  );

  const createTextAnnotation = useCallback(
    (pageNumber: number, position: Point, content: string): TextAnnotation => {
      const annotation: TextAnnotation = {
        id: generateId(),
        type: 'text',
        position,
        content,
        color: activeColor,
        fontSize,
        pageNumber,
      };
      addAnnotation(pageNumber, annotation);
      return annotation;
    },
    [activeColor, fontSize, addAnnotation]
  );

  const createNote = useCallback(
    (pageNumber: number, position: Point, content: string): NoteAnnotation => {
      const annotation: NoteAnnotation = {
        id: generateId(),
        type: 'note',
        position,
        content,
        color: activeColor,
        pageNumber,
        isExpanded: true,
      };
      addAnnotation(pageNumber, annotation);
      return annotation;
    },
    [activeColor, addAnnotation]
  );

  const createEmoji = useCallback(
    (pageNumber: number, position: Point, emoji: string): EmojiAnnotation => {
      const annotation: EmojiAnnotation = {
        id: generateId(),
        type: 'emoji',
        position,
        emoji,
        size: 32,
        pageNumber,
      };
      addAnnotation(pageNumber, annotation);
      return annotation;
    },
    [addAnnotation]
  );

  const createSticker = useCallback(
    (pageNumber: number, position: Point, sticker: string): StickerAnnotation => {
      const annotation: StickerAnnotation = {
        id: generateId(),
        type: 'sticker',
        position,
        sticker,
        size: 80,
        pageNumber,
      };
      addAnnotation(pageNumber, annotation);
      return annotation;
    },
    [addAnnotation]
  );

  const toggleAnnotationMode = useCallback(() => {
    setIsAnnotationMode((prev) => {
      if (prev) {
        setActiveTool('select');
        setSelectedAnnotationId(null);
      }
      return !prev;
    });
  }, []);

  return {
    annotations,
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    strokeWidth,
    setStrokeWidth,
    fontSize,
    setFontSize,
    isAnnotationMode,
    setIsAnnotationMode,
    toggleAnnotationMode,
    selectedAnnotationId,
    setSelectedAnnotationId,
    getPageAnnotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    clearPageAnnotations,
    clearAllAnnotations,
    createDrawing,
    createTextAnnotation,
    createNote,
    createEmoji,
    createSticker,
  };
}
