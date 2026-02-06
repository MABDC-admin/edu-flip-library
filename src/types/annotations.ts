export type AnnotationTool = 'select' | 'pen' | 'highlighter' | 'text' | 'note' | 'emoji' | 'sticker' | 'eraser';

export type AnnotationColor = string;

export interface Point {
  x: number;
  y: number;
}

export interface DrawingAnnotation {
  id: string;
  type: 'drawing';
  tool: 'pen' | 'highlighter';
  points: Point[];
  color: string;
  strokeWidth: number;
  opacity: number;
  pageNumber: number;
}

export interface TextAnnotation {
  id: string;
  type: 'text';
  position: Point;
  content: string;
  color: string;
  fontSize: number;
  pageNumber: number;
}

export interface NoteAnnotation {
  id: string;
  type: 'note';
  position: Point;
  content: string;
  color: string;
  pageNumber: number;
  isExpanded: boolean;
}

export interface EmojiAnnotation {
  id: string;
  type: 'emoji';
  position: Point;
  emoji: string;
  size: number;
  pageNumber: number;
}

export interface StickerAnnotation {
  id: string;
  type: 'sticker';
  position: Point;
  sticker: string;
  size: number;
  pageNumber: number;
}

export type Annotation =
  | DrawingAnnotation
  | TextAnnotation
  | NoteAnnotation
  | EmojiAnnotation
  | StickerAnnotation;

export interface AnnotationState {
  annotations: Record<number, Annotation[]>;
  activeTool: AnnotationTool;
  activeColor: string;
  strokeWidth: number;
  fontSize: number;
  isAnnotationMode: boolean;
}

export const ANNOTATION_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ffffff', // white
  '#000000', // black
];

export const HIGHLIGHTER_COLORS = [
  '#fde047', // yellow
  '#86efac', // green
  '#93c5fd', // blue
  '#fca5a5', // red
  '#c4b5fd', // purple
  '#fdba74', // orange
];

export const EMOJI_LIST = [
  '👍', '👎', '❤️', '⭐', '🔥', '💡',
  '✅', '❌', '❓', '❗', '🎯', '📌',
  '💯', '🏆', '🎉', '👏', '🤔', '📝',
  '✏️', '📖', '🔍', '💪', '🌟', '😊',
];

export const STICKER_LIST = [
  { id: 'great-job', label: 'Great Job!', bg: '#22c55e', text: '#fff' },
  { id: 'important', label: 'Important', bg: '#ef4444', text: '#fff' },
  { id: 'remember', label: 'Remember', bg: '#f59e0b', text: '#000' },
  { id: 'question', label: 'Question?', bg: '#3b82f6', text: '#fff' },
  { id: 'review', label: 'Review', bg: '#a855f7', text: '#fff' },
  { id: 'favorite', label: 'Favorite', bg: '#ec4899', text: '#fff' },
  { id: 'note-this', label: 'Note This', bg: '#06b6d4', text: '#fff' },
  { id: 'brilliant', label: 'Brilliant!', bg: '#f97316', text: '#fff' },
];
