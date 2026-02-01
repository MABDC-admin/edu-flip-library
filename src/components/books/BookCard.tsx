import { BookWithProgress, GRADE_LABELS } from '@/types/database';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface BookCardProps {
  book: BookWithProgress;
  className?: string;
  style?: React.CSSProperties;
}

const gradeColorClasses: Record<number, string> = {
  1: 'from-red-400 to-red-600',
  2: 'from-orange-400 to-orange-600',
  3: 'from-yellow-400 to-yellow-600',
  4: 'from-green-400 to-green-600',
  5: 'from-teal-400 to-teal-600',
  6: 'from-cyan-400 to-cyan-600',
  7: 'from-blue-400 to-blue-600',
  8: 'from-indigo-400 to-indigo-600',
  9: 'from-purple-400 to-purple-600',
  10: 'from-pink-400 to-pink-600',
  11: 'from-rose-400 to-rose-600',
  12: 'from-red-500 to-pink-500',
};

export function BookCard({ book, className, style }: BookCardProps) {
  const progress = book.reading_progress;
  const progressPercent = progress && book.page_count > 0
    ? Math.round((progress.current_page / book.page_count) * 100)
    : 0;
  
  const isCompleted = progress?.completed || progressPercent >= 100;
  const isStarted = progress && progress.current_page > 1;
  
  const gradeColor = gradeColorClasses[book.grade_level] || gradeColorClasses[1];
  
  return (
    <Link to={`/read/${book.id}`} style={style}>
      <Card className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:shadow-book hover:-translate-y-2 hover:scale-105",
        "animate-fade-in-up",
        className
      )}>
        {/* Book Cover */}
        <div className={cn(
          "aspect-[3/4] relative bg-gradient-to-br",
          gradeColor
        )}>
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <BookOpen className="w-16 h-16 text-white/50" />
            </div>
          )}
          
          {/* Grade badge */}
          <Badge className="absolute top-2 left-2 bg-white/90 text-foreground font-semibold">
            {GRADE_LABELS[book.grade_level]}
          </Badge>
          
          {/* Completion badge */}
          {isCompleted && (
            <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-success flex items-center justify-center shadow-lg">
              <Check className="w-5 h-5 text-success-foreground" />
            </div>
          )}
          
          {/* 3D book spine effect */}
          <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-black/20 to-transparent" />
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3 shadow-lg">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
        
        {/* Book info */}
        <div className="p-4 space-y-2">
          <h3 className="font-display font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          
          <p className="text-sm text-muted-foreground">
            {book.page_count} pages
          </p>
          
          {/* Progress bar */}
          {isStarted && !isCompleted && (
            <div className="space-y-1">
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {progressPercent}% complete
              </p>
            </div>
          )}
          
          {isCompleted && (
            <p className="text-sm font-medium text-success flex items-center gap-1">
              <Check className="w-4 h-4" />
              Completed!
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
