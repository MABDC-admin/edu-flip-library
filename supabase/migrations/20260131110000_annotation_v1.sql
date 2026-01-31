-- Create book_annotations table
CREATE TABLE public.book_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  type TEXT NOT NULL, -- 'pencil', 'highlighter', 'note'
  content JSONB NOT NULL, -- { points: [...], color: '...', width: ... } for pencil/highlighter, { text: '...', x: ..., y: ... } for note
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_book_annotations_book_id ON public.book_annotations(book_id);
CREATE INDEX idx_book_annotations_user_id ON public.book_annotations(user_id);
CREATE INDEX idx_book_annotations_page ON public.book_annotations(book_id, page_number);

-- Enable RLS
ALTER TABLE public.book_annotations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own annotations or admins can view all"
  ON public.book_annotations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own annotations"
  ON public.book_annotations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own annotations"
  ON public.book_annotations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own annotations"
  ON public.book_annotations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_book_annotations_updated_at
  BEFORE UPDATE ON public.book_annotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
