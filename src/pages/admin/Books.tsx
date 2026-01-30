import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Upload, Plus, Trash2, BookOpen, Loader2, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  gradeLevel: z.number().min(1).max(12),
});



export default function AdminBooks() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState<number>(1);
  const [filterGrade, setFilterGrade] = useState<string>('all');

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [html5Url, setHtml5Url] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: books, isLoading } = useQuery({
    queryKey: ['admin-books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Book[];
    },
  });

  const filteredBooks = books?.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = filterGrade === 'all' || book.grade_level === parseInt(filterGrade);
    return matchesSearch && matchesGrade;
  });

  const updateBook = useMutation({
    mutationFn: async ({ id, title, gradeLevel }: { id: string; title: string; gradeLevel: number }) => {
      const { data, error } = await supabase
        .from('books')
        .update({ title, grade_level: gradeLevel })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      setIsEditOpen(false);
      setEditingBook(null);
      toast({ title: 'Book updated! Γ£à' });
    },
    onError: (error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });

  const createBook = useMutation({
    mutationFn: async ({ title, gradeLevel, html5Url, coverFile }: { title: string; gradeLevel: number; html5Url: string; coverFile: File | null }) => {
      setIsUploading(true);
      try {
        // 1. Create book record
        const { data: book, error: bookError } = await supabase
          .from('books')
          .insert({
            title,
            grade_level: gradeLevel,
            status: 'ready',
            page_count: 0,
          })
          .select()
          .single();

        if (bookError) throw bookError;

        const bookId = book.id;
        let coverUrl = null;

        // 2. Upload Cover (if provided)
        if (coverFile) {
          const coverPath = `${bookId}/cover.png`;
          const { error: coverUploadError } = await supabase.storage
            .from('book-covers')
            .upload(coverPath, coverFile);

          if (coverUploadError) throw coverUploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('book-covers')
            .getPublicUrl(coverPath);

          coverUrl = publicUrl;
        }

        // 3. Update book record with URL
        const { error: updateError } = await supabase
          .from('books')
          .update({
            html5_url: html5Url,
            cover_url: coverUrl,
          })
          .eq('id', bookId);

        if (updateError) throw updateError;

        return book;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: 'Book added! ≡ƒôÜ',
        description: 'The HTML5 flipbook has been linked successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setTitle('');
    setGradeLevel(1);
    setHtml5Url('');
    setCoverFile(null);
    setErrors({});
  };

  const deleteBook = useMutation({
    mutationFn: async (bookId: string) => {
      // 1. Delete record (cascade should handle files if configured, but let's be safe)
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (error) throw error;

      // 2. Cleanup storage (Optional but recommended)
      await supabase.storage.from('pdf-uploads').remove([`${bookId}/source.pdf`]).catch(console.error);
      await supabase.storage.from('book-covers').remove([`${bookId}/cover.png`]).catch(console.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      toast({
        title: 'Book deleted',
        description: 'The book and its files have been removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!html5Url || !html5Url.trim()) {
      setErrors({ html5Url: 'Please provide an HTML5 flipbook URL.' });
      return;
    }

    try {
      formSchema.parse({ title, gradeLevel });
      setErrors({});
      createBook.mutate({ title, gradeLevel, html5Url, coverFile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-success/10 text-success border-success/20">Ready</Badge>;
      case 'processing':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Processing</Badge>;
      case 'error':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="Books">
      <div className="space-y-6">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-1 gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Input
                placeholder="Search books..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              <BookOpen className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {Object.entries(GRADE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary" onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Book
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Book</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Book Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter book title"
                      className={errors.title ? 'border-destructive' : ''}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive">{errors.title}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="grade">Grade Level</Label>
                      <Select
                        value={gradeLevel.toString()}
                        onValueChange={(value) => setGradeLevel(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(GRADE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cover">Cover Image (Optional)</Label>
                      <div className="relative">
                        <Input
                          id="cover"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="html5url">HTML5 Flipbook URL *</Label>
                    <Input
                      id="html5url"
                      type="url"
                      value={html5Url}
                      onChange={(e) => setHtml5Url(e.target.value)}
                      placeholder="https://yourserver.com/flipbooks/book1/index.html"
                      className="text-sm"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload HTML5 flipbook to your Nginx server and paste the index.html URL here
                    </p>
                    {errors.html5Url && (
                      <p className="text-sm text-destructive">{errors.html5Url}</p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isUploading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createBook.isPending || isUploading || !html5Url}
                      className="gradient-primary min-w-[120px]"
                    >
                      {createBook.isPending || isUploading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </div>
                      ) : (
                        'Add Book'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <p className="text-sm text-muted-foreground">
            {books?.length || 0} books in library
          </p>
        </div>

        {/* Books table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : books && books.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks?.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-primary" />
                          </div>
                          {book.title}
                        </div>
                      </TableCell>
                      <TableCell>{GRADE_LABELS[book.grade_level] || 'N/A'}</TableCell>
                      <TableCell>{book.page_count}</TableCell>
                      <TableCell>{getStatusBadge(book.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(book.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingBook(book);
                              setTitle(book.title);
                              setGradeLevel(book.grade_level);
                              setIsEditOpen(true);
                            }}
                            title="Edit Book"
                            className="text-accent hover:bg-accent/10"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/read/${book.id}`)}
                            title="View Flipbook"
                            className="text-primary hover:bg-primary/10"
                          >
                            <BookOpen className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteBook.mutate(book.id)}
                            disabled={deleteBook.isPending}
                            title="Delete Book"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No books found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || filterGrade !== 'all'
                    ? "Try adjusting your filters to find what you're looking for"
                    : "Start by adding your first book to the library"}
                </p>
                {!searchQuery && filterGrade === 'all' && (
                  <Button onClick={() => setIsDialogOpen(true)} className="gradient-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Book
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Book Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Book Title</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-grade">Grade Level</Label>
                <Select
                  value={gradeLevel.toString()}
                  onValueChange={(value) => setGradeLevel(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GRADE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="gradient-primary"
                  onClick={() => editingBook && updateBook.mutate({
                    id: editingBook.id,
                    title,
                    gradeLevel
                  })}
                  disabled={updateBook.isPending}
                >
                  {updateBook.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
