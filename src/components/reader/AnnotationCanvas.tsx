import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type {
  Annotation,
  AnnotationTool,
  Point,
  DrawingAnnotation,
  NoteAnnotation,
} from '@/types/annotations';
import { STICKER_LIST } from '@/types/annotations';

interface AnnotationCanvasProps {
  pageNumber: number;
  annotations: Annotation[];
  activeTool: AnnotationTool;
  activeColor: string;
  strokeWidth: number;
  fontSize: number;
  isAnnotationMode: boolean;
  selectedEmoji: string;
  selectedSticker: string;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onCreateDrawing: (pageNumber: number, points: Point[], tool: 'pen' | 'highlighter') => void;
  onCreateText: (pageNumber: number, position: Point, content: string) => void;
  onCreateNote: (pageNumber: number, position: Point, content: string) => void;
  onCreateEmoji: (pageNumber: number, position: Point, emoji: string) => void;
  onCreateSticker: (pageNumber: number, position: Point, sticker: string) => void;
  onUpdateAnnotation: (pageNumber: number, id: string, updates: Partial<Annotation>) => void;
  onRemoveAnnotation: (pageNumber: number, id: string) => void;
  width: number;
  height: number;
}

export function AnnotationCanvas({
  pageNumber,
  annotations,
  activeTool,
  activeColor,
  strokeWidth,
  fontSize,
  isAnnotationMode,
  selectedEmoji,
  selectedSticker,
  selectedAnnotationId,
  onSelectAnnotation,
  onCreateDrawing,
  onCreateText,
  onCreateNote,
  onCreateEmoji,
  onCreateSticker,
  onUpdateAnnotation,
  onRemoveAnnotation,
  width,
  height,
}: AnnotationCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const getSvgPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return {
        x: ((clientX - rect.left) / rect.width) * width,
        y: ((clientY - rect.top) / rect.height) * height,
      };
    },
    [width, height]
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isAnnotationMode) return;
      e.stopPropagation();
      e.preventDefault();

      const point = getSvgPoint(e);

      if (activeTool === 'pen' || activeTool === 'highlighter') {
        setIsDrawing(true);
        setCurrentPoints([point]);
      } else if (activeTool === 'text') {
        const id = `temp_text_${Date.now()}`;
        setEditingTextId(id);
        onCreateText(pageNumber, point, '');
      } else if (activeTool === 'note') {
        onCreateNote(pageNumber, point, '');
      } else if (activeTool === 'emoji' && selectedEmoji) {
        onCreateEmoji(pageNumber, point, selectedEmoji);
      } else if (activeTool === 'sticker' && selectedSticker) {
        onCreateSticker(pageNumber, point, selectedSticker);
      } else if (activeTool === 'eraser') {
        // Find annotation near this point and remove it
        const hit = findAnnotationAtPoint(point);
        if (hit) {
          onRemoveAnnotation(pageNumber, hit.id);
        }
      } else if (activeTool === 'select') {
        const hit = findAnnotationAtPoint(point);
        onSelectAnnotation(hit ? hit.id : null);
      }
    },
    [
      isAnnotationMode,
      activeTool,
      getSvgPoint,
      selectedEmoji,
      selectedSticker,
      pageNumber,
      onCreateText,
      onCreateNote,
      onCreateEmoji,
      onCreateSticker,
      onRemoveAnnotation,
      onSelectAnnotation,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing) return;
      e.stopPropagation();
      e.preventDefault();
      const point = getSvgPoint(e);
      setCurrentPoints((prev) => [...prev, point]);
    },
    [isDrawing, getSvgPoint]
  );

  const handlePointerUp = useCallback(() => {
    if (isDrawing && currentPoints.length > 1) {
      const tool = activeTool === 'highlighter' ? 'highlighter' : 'pen';
      onCreateDrawing(pageNumber, currentPoints, tool);
    }
    setIsDrawing(false);
    setCurrentPoints([]);
  }, [isDrawing, currentPoints, activeTool, pageNumber, onCreateDrawing]);

  // Drag for emojis, stickers, notes
  const handleAnnotationDragStart = useCallback(
    (e: React.MouseEvent, annotation: Annotation) => {
      if (activeTool !== 'select') return;
      e.stopPropagation();
      const point = getSvgPoint(e);
      if ('position' in annotation) {
        setDraggingId(annotation.id);
        setDragOffset({
          x: point.x - annotation.position.x,
          y: point.y - annotation.position.y,
        });
      }
    },
    [activeTool, getSvgPoint]
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingId) return;
      e.stopPropagation();
      const point = getSvgPoint(e);
      const annotation = annotations.find((a) => a.id === draggingId);
      if (annotation && 'position' in annotation) {
        onUpdateAnnotation(pageNumber, draggingId, {
          position: {
            x: point.x - dragOffset.x,
            y: point.y - dragOffset.y,
          },
        } as any);
      }
    },
    [draggingId, dragOffset, annotations, getSvgPoint, pageNumber, onUpdateAnnotation]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const findAnnotationAtPoint = useCallback(
    (point: Point): Annotation | null => {
      // Check stickers, emojis, notes, text first (they are on top)
      for (let i = annotations.length - 1; i >= 0; i--) {
        const a = annotations[i];
        if (a.type === 'emoji' || a.type === 'sticker' || a.type === 'note' || a.type === 'text') {
          const pos = 'position' in a ? a.position : null;
          if (pos) {
            const size = a.type === 'sticker' ? 80 : a.type === 'emoji' ? 32 : 100;
            if (
              point.x >= pos.x - size / 2 &&
              point.x <= pos.x + size / 2 &&
              point.y >= pos.y - size / 2 &&
              point.y <= pos.y + size / 2
            ) {
              return a;
            }
          }
        }
        if (a.type === 'drawing') {
          const tolerance = Math.max(a.strokeWidth * 2, 10);
          for (const p of a.points) {
            const dx = point.x - p.x;
            const dy = point.y - p.y;
            if (Math.sqrt(dx * dx + dy * dy) < tolerance) {
              return a;
            }
          }
        }
      }
      return null;
    },
    [annotations]
  );

  const pointsToPath = (points: Point[]): string => {
    if (points.length === 0) return '';
    const [first, ...rest] = points;
    let d = `M ${first.x} ${first.y}`;
    for (let i = 0; i < rest.length - 1; i++) {
      const cp = {
        x: (rest[i].x + (rest[i + 1]?.x || rest[i].x)) / 2,
        y: (rest[i].y + (rest[i + 1]?.y || rest[i].y)) / 2,
      };
      d += ` Q ${rest[i].x} ${rest[i].y} ${cp.x} ${cp.y}`;
    }
    if (rest.length > 0) {
      const last = rest[rest.length - 1];
      d += ` L ${last.x} ${last.y}`;
    }
    return d;
  };

  useEffect(() => {
    if (editingTextId && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [editingTextId]);

  const getCursorStyle = (): string => {
    if (!isAnnotationMode) return 'default';
    switch (activeTool) {
      case 'pen':
      case 'highlighter':
        return 'crosshair';
      case 'text':
        return 'text';
      case 'eraser':
        return 'pointer';
      case 'emoji':
      case 'sticker':
      case 'note':
        return 'copy';
      default:
        return 'default';
    }
  };

  return (
    <div
      className="absolute inset-0 z-20"
      style={{ pointerEvents: isAnnotationMode ? 'auto' : 'none' }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        style={{ cursor: getCursorStyle() }}
        onMouseDown={handlePointerDown}
        onMouseMove={(e) => {
          handlePointerMove(e);
          handleDragMove(e);
        }}
        onMouseUp={() => {
          handlePointerUp();
          handleDragEnd();
        }}
        onMouseLeave={() => {
          handlePointerUp();
          handleDragEnd();
        }}
      >
        {/* Rendered Annotations */}
        {annotations.map((annotation) => {
          if (annotation.type === 'drawing') {
            const d = annotation as DrawingAnnotation;
            return (
              <path
                key={d.id}
                d={pointsToPath(d.points)}
                fill="none"
                stroke={d.color}
                strokeWidth={d.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={d.opacity}
                className={cn(
                  'transition-opacity',
                  selectedAnnotationId === d.id && 'drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]'
                )}
              />
            );
          }
          return null;
        })}

        {/* Current drawing in progress */}
        {isDrawing && currentPoints.length > 1 && (
          <path
            d={pointsToPath(currentPoints)}
            fill="none"
            stroke={activeColor}
            strokeWidth={activeTool === 'highlighter' ? strokeWidth * 4 : strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={activeTool === 'highlighter' ? 0.35 : 1}
          />
        )}

        {/* Text annotations */}
        {annotations
          .filter((a) => a.type === 'text')
          .map((a) => {
            const t = a as any;
            return (
              <foreignObject
                key={t.id}
                x={t.position.x}
                y={t.position.y}
                width={200}
                height={100}
                onMouseDown={(e) => handleAnnotationDragStart(e, t)}
              >
                <div
                  className={cn(
                    'text-sm break-words',
                    selectedAnnotationId === t.id && 'outline outline-2 outline-primary outline-offset-2 rounded'
                  )}
                  style={{ color: t.color, fontSize: `${t.fontSize}px` }}
                >
                  {t.content || (
                    <span className="opacity-50 italic text-xs">{'Click to type...'}</span>
                  )}
                </div>
              </foreignObject>
            );
          })}

        {/* Emoji annotations */}
        {annotations
          .filter((a) => a.type === 'emoji')
          .map((a) => {
            const e = a as any;
            return (
              <foreignObject
                key={e.id}
                x={e.position.x - e.size / 2}
                y={e.position.y - e.size / 2}
                width={e.size}
                height={e.size}
                onMouseDown={(ev) => handleAnnotationDragStart(ev as any, e)}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-full h-full select-none cursor-move transition-transform hover:scale-110',
                    selectedAnnotationId === e.id && 'ring-2 ring-primary rounded-full'
                  )}
                  style={{ fontSize: `${e.size * 0.75}px` }}
                >
                  {e.emoji}
                </div>
              </foreignObject>
            );
          })}

        {/* Sticker annotations */}
        {annotations
          .filter((a) => a.type === 'sticker')
          .map((a) => {
            const s = a as any;
            const stickerData = STICKER_LIST.find((st) => st.id === s.sticker);
            if (!stickerData) return null;
            return (
              <foreignObject
                key={s.id}
                x={s.position.x - s.size / 2}
                y={s.position.y - 15}
                width={s.size}
                height={30}
                onMouseDown={(ev) => handleAnnotationDragStart(ev as any, s)}
              >
                <div
                  className={cn(
                    'flex items-center justify-center rounded-md text-[10px] font-bold px-2 py-1 select-none cursor-move shadow-lg transition-transform hover:scale-105 whitespace-nowrap',
                    selectedAnnotationId === s.id && 'ring-2 ring-white'
                  )}
                  style={{ backgroundColor: stickerData.bg, color: stickerData.text }}
                >
                  {stickerData.label}
                </div>
              </foreignObject>
            );
          })}

        {/* Note annotations */}
        {annotations
          .filter((a) => a.type === 'note')
          .map((a) => {
            const n = a as NoteAnnotation;
            return (
              <foreignObject
                key={n.id}
                x={n.position.x}
                y={n.position.y}
                width={160}
                height={n.isExpanded ? 120 : 28}
                onMouseDown={(ev) => handleAnnotationDragStart(ev as any, n)}
              >
                <div
                  className={cn(
                    'rounded-lg shadow-lg overflow-hidden cursor-move transition-all',
                    selectedAnnotationId === n.id && 'ring-2 ring-white'
                  )}
                  style={{ backgroundColor: n.color + '20', borderLeft: `3px solid ${n.color}` }}
                >
                  <div
                    className="flex items-center justify-between px-2 py-1 cursor-pointer"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onUpdateAnnotation(pageNumber, n.id, { isExpanded: !n.isExpanded } as any);
                    }}
                  >
                    <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider">
                      Note
                    </span>
                    <span className="text-[9px] text-white/50">
                      {n.isExpanded ? '-' : '+'}
                    </span>
                  </div>
                  {n.isExpanded && (
                    <div className="px-2 pb-2">
                      {editingNoteId === n.id ? (
                        <textarea
                          className="w-full h-16 bg-transparent text-white text-[11px] resize-none outline-none placeholder:text-white/30"
                          value={n.content}
                          placeholder="Write your note..."
                          onChange={(ev) =>
                            onUpdateAnnotation(pageNumber, n.id, { content: ev.target.value } as any)
                          }
                          onBlur={() => setEditingNoteId(null)}
                          autoFocus
                          onMouseDown={(ev) => ev.stopPropagation()}
                        />
                      ) : (
                        <div
                          className="text-[11px] text-white/80 min-h-[40px] cursor-text"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setEditingNoteId(n.id);
                          }}
                        >
                          {n.content || (
                            <span className="text-white/30 italic">{'Click to write...'}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </foreignObject>
            );
          })}
      </svg>

      {/* Floating text input for new text annotations */}
      {editingTextId && (
        <div className="absolute inset-0 z-30" onClick={() => setEditingTextId(null)}>
          <textarea
            ref={textInputRef}
            className="absolute bg-black/50 backdrop-blur text-white border border-white/20 rounded-lg p-2 text-sm resize-none outline-none min-w-[120px] min-h-[60px]"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              color: activeColor,
              fontSize: `${fontSize}px`,
            }}
            placeholder="Type your annotation..."
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                setEditingTextId(null);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
