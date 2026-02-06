import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  ChevronLeft,
  ChevronRight,
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
  onClearPage,
  onClearAll,
  onEmojiSelect,
  onStickerSelect,
  selectedEmoji,
  selectedSticker,
}: AnnotationToolbarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);

  const togglePanel = (panel: string) => {
    setExpandedPanel((prev) => (prev === panel ? null : panel));
  };

  if (!isAnnotationMode) {
    return (
      <button
        onClick={onToggleAnnotationMode}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-black/60 backdrop-blur-2xl border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 hover:border-white/30 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:scale-110"
        title="Open Annotation Tools"
        aria-label="Open Annotation Tools"
      >
        <Pen className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex items-start gap-2"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Expanded Panels */}
      {expandedPanel && (
        <div className="bg-black/70 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-3 animate-in slide-in-from-right-2 fade-in duration-200 max-h-[70vh] overflow-y-auto">
          {expandedPanel === 'colors' && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold px-1">
                {activeTool === 'highlighter' ? 'Highlight Color' : 'Color'}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(activeTool === 'highlighter' ? HIGHLIGHTER_COLORS : ANNOTATION_COLORS).map(
                  (color) => (
                    <button
                      key={color}
                      onClick={() => onColorChange(color)}
                      className={cn(
                        'w-8 h-8 rounded-lg border-2 transition-all hover:scale-110',
                        activeColor === color
                          ? 'border-white shadow-[0_0_12px_rgba(255,255,255,0.3)] scale-110'
                          : 'border-white/10 hover:border-white/30'
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  )
                )}
              </div>
            </div>
          )}

          {expandedPanel === 'size' && (
            <div className="space-y-3 min-w-[140px]">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold px-1">
                {activeTool === 'text' ? 'Font Size' : 'Stroke Width'}
              </p>
              <div className="flex items-center gap-2">
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
                <div className="flex-1 text-center">
                  <span className="text-sm text-white font-mono">
                    {activeTool === 'text' ? `${fontSize}px` : `${strokeWidth}px`}
                  </span>
                </div>
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
              {/* Preview */}
              <div className="flex items-center justify-center p-3 rounded-lg bg-white/5">
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

          {expandedPanel === 'emoji' && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold px-1">
                Emojis
              </p>
              <div className="grid grid-cols-4 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onEmojiSelect(emoji)}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all hover:bg-white/10 hover:scale-110',
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

          {expandedPanel === 'sticker' && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold px-1">
                Stickers
              </p>
              <div className="flex flex-col gap-1.5">
                {STICKER_LIST.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => onStickerSelect(sticker.id)}
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

          {expandedPanel === 'clear' && (
            <div className="space-y-2 min-w-[140px]">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold px-1">
                Clear
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

      {/* Main Toolbar */}
      <div
        className={cn(
          'bg-black/70 backdrop-blur-2xl rounded-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col items-center transition-all duration-300',
          isCollapsed ? 'p-1.5' : 'p-2 gap-1'
        )}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            setExpandedPanel(null);
          }}
          className="w-8 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors mb-1"
          aria-label={isCollapsed ? 'Expand toolbar' : 'Collapse toolbar'}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {!isCollapsed && (
          <>
            {/* Tool Buttons */}
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
                    else if (
                      tool.id === 'pen' ||
                      tool.id === 'highlighter' ||
                      tool.id === 'text'
                    ) {
                      // Close emoji/sticker panels, keep color/size available
                      if (expandedPanel === 'emoji' || expandedPanel === 'sticker') {
                        setExpandedPanel(null);
                      }
                    } else {
                      setExpandedPanel(null);
                    }
                  }}
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                    isActive
                      ? 'bg-primary text-white shadow-[0_0_16px_rgba(59,130,246,0.4)]'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  )}
                  title={tool.label}
                  aria-label={tool.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}

            {/* Divider */}
            <div className="w-6 h-[1px] bg-white/10 my-1" />

            {/* Color Picker (for drawing/text tools) */}
            {(activeTool === 'pen' ||
              activeTool === 'highlighter' ||
              activeTool === 'text' ||
              activeTool === 'note') && (
              <button
                onClick={() => togglePanel('colors')}
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                  expandedPanel === 'colors'
                    ? 'bg-white/15'
                    : 'hover:bg-white/10'
                )}
                title="Color"
                aria-label="Choose color"
              >
                <div
                  className="w-5 h-5 rounded-full border-2 border-white/30"
                  style={{ backgroundColor: activeColor }}
                />
              </button>
            )}

            {/* Size Picker (for drawing/text tools) */}
            {(activeTool === 'pen' ||
              activeTool === 'highlighter' ||
              activeTool === 'text') && (
              <button
                onClick={() => togglePanel('size')}
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white transition-all',
                  expandedPanel === 'size'
                    ? 'bg-white/15 text-white'
                    : 'hover:bg-white/10'
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

            {/* Clear button */}
            <button
              onClick={() => togglePanel('clear')}
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-red-400 transition-all',
                expandedPanel === 'clear' ? 'bg-white/10 text-red-400' : 'hover:bg-white/10'
              )}
              title="Clear annotations"
              aria-label="Clear annotations"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Divider */}
            <div className="w-6 h-[1px] bg-white/10 my-1" />

            {/* Close Annotation Mode */}
            <button
              onClick={onToggleAnnotationMode}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              title="Close Annotation Tools"
              aria-label="Close Annotation Tools"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title="Expand toolbar"
            aria-label="Expand toolbar"
          >
            <Pen className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
