import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  MousePointer2,
  Pen,
  Highlighter,
  Type,
  StickyNote,
  Smile,
  Sticker,
  Eraser,
  Trash2,
  X,
  Minus,
  Plus,
} from 'lucide-react';
import type { AnnotationTool } from '@/types/annotations';
import {
  ANNOTATION_COLORS,
  HIGHLIGHTER_COLORS,
  EMOJI_LIST,
  STICKER_LIST,
} from '@/types/annotations';

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  isAnnotationMode: boolean;
  onToggleAnnotationMode: () => void;
  onCloseAnnotationMode: () => void;
  onClearPage: () => void;
  onClearAll: () => void;
  onEmojiSelect: (emoji: string) => void;
  onStickerSelect: (sticker: string) => void;
  selectedEmoji: string;
  selectedSticker: string;
}

const TOOLS: { id: AnnotationTool; icon: typeof Pen; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'pen', icon: Pen, label: 'Pen' },
  { id: 'highlighter', icon: Highlighter, label: 'Highlight' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'note', icon: StickyNote, label: 'Note' },
  { id: 'emoji', icon: Smile, label: 'Emoji' },
  { id: 'sticker', icon: Sticker, label: 'Sticker' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
];

export function AnnotationToolbar({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  fontSize,
  onFontSizeChange,
  isAnnotationMode,
  onToggleAnnotationMode,
  onCloseAnnotationMode,
  onClearPage,
  onClearAll,
  onEmojiSelect,
  onStickerSelect,
  selectedEmoji,
  selectedSticker,
}: AnnotationToolbarProps) {
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click
  useEffect(() => {
    if (!expandedPanel) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpandedPanel(null);
      }
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [expandedPanel]);

  const togglePanel = (panel: string) => {
    setExpandedPanel((prev) => (prev === panel ? null : panel));
  };

  // Inactive state: single floating pen button at top-center, below header
  if (!isAnnotationMode) {
    return (
      <button
        onClick={onToggleAnnotationMode}
        className="fixed top-[88px] left-1/2 -translate-x-1/2 z-50 h-9 px-3.5 rounded-full bg-black/60 backdrop-blur-2xl border border-white/20 flex items-center gap-2 text-white/70 hover:text-white hover:bg-black/80 hover:border-white/30 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:scale-105"
        title="Open Annotation Tools"
        aria-label="Open Annotation Tools"
      >
        <Pen className="w-4 h-4" />
        <span className="text-[11px] font-medium tracking-wide">Annotate</span>
      </button>
    );
  }

  const showColorPicker =
    activeTool === 'pen' ||
    activeTool === 'highlighter' ||
    activeTool === 'text' ||
    activeTool === 'note';

  const showSizePicker =
    activeTool === 'pen' ||
    activeTool === 'highlighter' ||
    activeTool === 'text';

  return (
    <div
      ref={panelRef}
      className="fixed top-[88px] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Main horizontal toolbar */}
      <div className="bg-black/70 backdrop-blur-2xl rounded-full border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)] px-2 py-1.5 flex items-center gap-0.5">
        {/* All tool buttons */}
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => {
                onToolChange(tool.id);
                if (tool.id === 'emoji') togglePanel('emoji');
                else if (tool.id === 'sticker') togglePanel('sticker');
                else if (expandedPanel === 'emoji' || expandedPanel === 'sticker') {
                  setExpandedPanel(null);
                }
              }}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all relative group',
                isActive
                  ? 'bg-primary text-white shadow-[0_0_16px_rgba(59,130,246,0.4)]'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              )}
              title={tool.label}
              aria-label={tool.label}
            >
              <Icon className="w-4 h-4" />
              {/* Tooltip */}
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[9px] text-white/70 bg-black/80 px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                {tool.label}
              </span>
            </button>
          );
        })}

        {/* Separator */}
        <div className="w-[1px] h-6 bg-white/15 mx-1" />

        {/* Color picker toggle */}
        {showColorPicker && (
          <button
            onClick={() => togglePanel('colors')}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-all',
              expandedPanel === 'colors' ? 'bg-white/15' : 'hover:bg-white/10'
            )}
            title="Color"
            aria-label="Choose color"
          >
            <div
              className="w-5 h-5 rounded-full border-2 border-white/30 transition-transform hover:scale-110"
              style={{ backgroundColor: activeColor }}
            />
          </button>
        )}

        {/* Size picker toggle */}
        {showSizePicker && (
          <button
            onClick={() => togglePanel('size')}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all',
              expandedPanel === 'size' ? 'bg-white/15 text-white' : 'hover:bg-white/10'
            )}
            title="Size"
            aria-label="Adjust size"
          >
            <div className="flex items-center gap-0.5">
              <div className="w-1 h-1 rounded-full bg-current" />
              <div className="w-1.5 h-1.5 rounded-full bg-current" />
              <div className="w-2 h-2 rounded-full bg-current" />
            </div>
          </button>
        )}

        {/* Separator */}
        <div className="w-[1px] h-6 bg-white/15 mx-1" />

        {/* Clear */}
        <button
          onClick={() => togglePanel('clear')}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-red-400 transition-all',
            expandedPanel === 'clear' ? 'bg-white/10 text-red-400' : 'hover:bg-white/10'
          )}
          title="Clear annotations"
          aria-label="Clear annotations"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Close */}
        <button
          onClick={onCloseAnnotationMode}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-all"
          title="Close Annotation Tools"
          aria-label="Close Annotation Tools"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drop-down panels (below the toolbar) */}
      {expandedPanel && (
        <div className="mt-2 bg-black/70 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-3 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[50vh] overflow-y-auto">
          {/* Color panel */}
          {expandedPanel === 'colors' && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold px-1">
                {activeTool === 'highlighter' ? 'Highlight Color' : 'Color'}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap max-w-[280px]">
                {(activeTool === 'highlighter'
                  ? HIGHLIGHTER_COLORS
                  : ANNOTATION_COLORS
                ).map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onColorChange(color);
                      setExpandedPanel(null);
                    }}
                    className={cn(
                      'w-7 h-7 rounded-lg border-2 transition-all hover:scale-110',
                      activeColor === color
                        ? 'border-white shadow-[0_0_12px_rgba(255,255,255,0.3)] scale-110'
                        : 'border-white/10 hover:border-white/30'
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size panel */}
          {expandedPanel === 'size' && (
            <div className="space-y-2 min-w-[160px]">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold px-1">
                {activeTool === 'text' ? 'Font Size' : 'Stroke Width'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    activeTool === 'text'
                      ? onFontSizeChange(Math.max(10, fontSize - 2))
                      : onStrokeWidthChange(Math.max(1, strokeWidth - 1))
                  }
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm text-white font-mono w-12 text-center">
                  {activeTool === 'text' ? `${fontSize}px` : `${strokeWidth}px`}
                </span>
                <button
                  onClick={() =>
                    activeTool === 'text'
                      ? onFontSizeChange(Math.min(48, fontSize + 2))
                      : onStrokeWidthChange(Math.min(20, strokeWidth + 1))
                  }
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              {/* Preview dot/text */}
              <div className="flex items-center justify-center p-2 rounded-lg bg-white/5">
                {activeTool === 'text' ? (
                  <span style={{ fontSize: `${Math.min(fontSize, 28)}px`, color: activeColor }}>
                    Aa
                  </span>
                ) : (
                  <div
                    className="rounded-full"
                    style={{
                      width: `${Math.min(strokeWidth * 3, 40)}px`,
                      height: `${Math.min(strokeWidth * 3, 40)}px`,
                      backgroundColor: activeColor,
                      opacity: activeTool === 'highlighter' ? 0.35 : 1,
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Emoji panel */}
          {expandedPanel === 'emoji' && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold px-1">
                Pick an Emoji
              </p>
              <div className="grid grid-cols-6 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onEmojiSelect(emoji);
                      setExpandedPanel(null);
                    }}
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all hover:bg-white/10 hover:scale-110',
                      selectedEmoji === emoji && 'bg-white/15 ring-2 ring-primary scale-110'
                    )}
                    aria-label={`Select emoji ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sticker panel */}
          {expandedPanel === 'sticker' && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold px-1">
                Pick a Sticker
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STICKER_LIST.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => {
                      onStickerSelect(sticker.id);
                      setExpandedPanel(null);
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105',
                      selectedSticker === sticker.id && 'ring-2 ring-white scale-105'
                    )}
                    style={{ backgroundColor: sticker.bg, color: sticker.text }}
                  >
                    {sticker.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear panel */}
          {expandedPanel === 'clear' && (
            <div className="space-y-2 min-w-[160px]">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold px-1">
                Clear Annotations
              </p>
              <button
                onClick={() => {
                  onClearPage();
                  setExpandedPanel(null);
                }}
                className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors text-left"
              >
                Clear This Page
              </button>
              <button
                onClick={() => {
                  onClearAll();
                  setExpandedPanel(null);
                }}
                className="w-full px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors text-left"
              >
                Clear All Pages
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
