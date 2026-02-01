import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookWithProgress, GRADE_LABELS } from '@/types/database';
import { BookOpen, FileText, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BookDetailsDialogProps {
  book: BookWithProgress | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const gradeColorClasses: Record<number, string> = {
  1: 'bg-grade-1/10 text-grade-1 border-grade-1/30',
  2: 'bg-grade-2/10 text-grade-2 border-grade-2/30',
  3: 'bg-grade-3/10 text-grade-3 border-grade-3/30',
  4: 'bg-grade-4/10 text-grade-4 border-grade-4/30',
  5: 'bg-grade-5/10 text-grade-5 border-grade-5/30',
  6: 'bg-grade-6/10 text-grade-6 border-grade-6/30',
  7: 'bg-grade-7/10 text-grade-7 border-grade-7/30',
  8: 'bg-grade-8/10 text-grade-8 border-grade-8/30',
  9: 'bg-grade-9/10 text-grade-9 border-grade-9/30',
  10: 'bg-grade-10/10 text-grade-10 border-grade-10/30',
  11: 'bg-grade-11/10 text-grade-11 border-grade-11/30',
  12: 'bg-grade-12/10 text-grade-12 border-grade-12/30',
};

export function BookDetailsDialog({ book, open, onOpenChange }: BookDetailsDialogProps) {
  const navigate = useNavigate();

  if (!book) return null;

  const handleOpenBook = () => {
    onOpenChange(false);
    navigate(`/read/${book.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-3">
            <span className="font-display text-xl">{book.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Book Cover Preview */}
          <div className="flex gap-6">
            <div className="w-32 h-44 rounded-lg overflow-hidden bg-muted flex-shrink-0 shadow-md">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                  <BookOpen className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Book Meta */}
            <div className="space-y-3 flex-1">
              <Badge 
                variant="outline" 
                className={gradeColorClasses[book.grade_level] || 'bg-muted'}
              >
                {GRADE_LABELS[book.grade_level]}
              </Badge>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>{book.page_count} pages</span>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Added {new Date(book.created_at).toLocaleDateString()}</span>
                </div>

                {book.uploaded_by && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>Uploaded by admin</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Badge 
                  variant={book.status === 'ready' ? 'default' : 'secondary'}
                  className={book.status === 'ready' ? 'bg-success' : ''}
                >
                  {book.status === 'ready' ? 'Available' : book.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleOpenBook} className="flex-1 gradient-primary gap-2">
              <BookOpen className="w-4 h-4" />
              Open Book
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
