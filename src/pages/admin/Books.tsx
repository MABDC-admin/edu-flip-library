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
import { Upload, Plus, Trash2, BookOpen, Loader2, Edit2, LayoutGrid, List, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePdfToImages } from '@/hooks/usePdfToImages';
import { GRADE_LABELS, Book } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';
import { cn } from '@/lib/utils';
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  gradeLevel: z.number().min(1).max(12),
});

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export default function AdminBooks() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState<number>(1);
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkGrade, setBulkGrade] = useState<number>(1);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, currentTitle: '' });
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');

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
      toast({ title: 'Book updated! ✅' });
    },
    onError: (error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });

  const { progress: pdfProgress, processInBrowser, reset: resetPdfProgress } = usePdfToImages();

  const uploadSingleBook = async (title: string, grade: number, pdf: File, cover: File | null) => {
    // 1. Create book record
    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        title,
        grade_level: grade,
        status: 'processing',
        page_count: 0,
      })
      .select()
      .single();

    if (bookError) throw bookError;
    const bookId = book.id;

    // 2. Upload PDF
    const pdfPath = `${bookId}/source.pdf`;
    const { error: pdfUploadError } = await supabase.storage
      .from('pdf-uploads')
      .upload(pdfPath, pdf);
    if (pdfUploadError) throw pdfUploadError;

    let coverUrl = null;
    // 3. Upload Cover
    if (cover) {
      const coverPath = `${bookId}/cover.png`;
      await supabase.storage.from('book-covers').upload(coverPath, cover);
      coverUrl = supabase.storage.from('book-covers').getPublicUrl(coverPath).data.publicUrl;
    }

    // 4. Update PDF URL
    await supabase.from('books').update({ pdf_url: pdfPath }).eq('id', bookId);

    // 5. Process Pages and get automated cover
    const { numPages, firstPageUrl } = await processInBrowser(bookId, pdf);

    // 6. Final Update: status, total pages, and cover (if none provided)
    await supabase.from('books').update({
      page_count: numPages,
      status: 'ready',
      cover_url: coverUrl || firstPageUrl, // Use first page if manual cover is missing
    }).eq('id', bookId);

    return book;
  };

  const createBook = useMutation({
    mutationFn: async ({ title, gradeLevel, pdfFile, coverFile }: { title: string; gradeLevel: number; pdfFile: File; coverFile: File | null }) => {
      setIsUploading(true);
      try {
        return await uploadSingleBook(title, gradeLevel, pdfFile, coverFile);
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      setIsDialogOpen(false);
      resetForm();
      resetPdfProgress();
      toast({ title: 'Book uploaded! 📚' });
    },
    onError: (error) => {
      resetPdfProgress();
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;
    setIsUploading(true);
    setBulkProgress({ done: 0, total: bulkFiles.length, currentTitle: '' });

    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];
      const title = file.name.replace(/\.[^/.]+$/, ""); // Strip extension
      setBulkProgress(p => ({ ...p, currentTitle: title }));

      try {
        await uploadSingleBook(title, bulkGrade, file, null);
        setBulkProgress(p => ({ ...p, done: i + 1 }));
      } catch (err) {
        toast({ title: `Failed: ${title}`, variant: 'destructive' });
      }
    }

    setIsUploading(false);
    setIsBulkOpen(false);
    setBulkFiles([]);
    queryClient.invalidateQueries({ queryKey: ['admin-books'] });
    toast({ title: 'Bulk upload complete! 🚀' });
  };

  const resetForm = () => {
    setTitle('');
    setGradeLevel(1);
    setPdfFile(null);
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

    if (!pdfFile) {
      setErrors({ pdf: 'PDF file is required' });
      return;
    }

    if (pdfFile.size > MAX_FILE_SIZE) {
      setErrors({ pdf: `PDF is too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` });
      return;
    }

    try {
      formSchema.parse({ title, gradeLevel });
      setErrors({});
      createBook.mutate({ title, gradeLevel, pdfFile, coverFile });
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

            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('table')}
                className="w-9 h-9"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="w-9 h-9"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Bulk Upload PDFs</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Grade Level (for all books)</Label>
                      <Select
                        value={bulkGrade.toString()}
                        onValueChange={(val) => setBulkGrade(parseInt(val))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(GRADE_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        multiple
                        accept=".pdf"
                        onChange={(e) => setBulkFiles(Array.from(e.target.files || []))}
                        className="hidden"
                        id="bulk-pdf"
                      />
                      <label htmlFor="bulk-pdf" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">Click to select multiple PDFs</p>
                        <p className="text-xs text-muted-foreground">{bulkFiles.length} files selected</p>
                      </label>
                    </div>
                    <Button
                      onClick={handleBulkUpload}
                      disabled={isUploading || bulkFiles.length === 0}
                      className="w-full gradient-primary"
                    >
                      {isUploading ? (
                        <div className="flex flex-col gap-1 items-center">
                          <span className="text-xs">Processing {bulkProgress.done}/{bulkProgress.total}</span>
                          <span className="text-[10px] opacity-70 truncate max-w-[200px]">{bulkProgress.currentTitle}</span>
                        </div>
                      ) : (
                        `Upload ${bulkFiles.length} Books`
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

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
                      <Label htmlFor="pdf">Course PDF File</Label>
                      <div className={cn(
                        "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                        pdfFile ? "border-primary/50 bg-primary/5" : "border-slate-200 hover:border-primary/30"
                      )}>
                        <input
                          id="pdf"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <label htmlFor="pdf" className="cursor-pointer">
                          <Upload className={cn("w-8 h-8 mx-auto mb-2", pdfFile ? "text-primary" : "text-muted-foreground")} />
                          {pdfFile ? (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-primary line-clamp-1">{pdfFile.name}</p>
                              <p className="text-xs text-muted-foreground">{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-medium">Click to upload PDF</p>
                              <p className="text-xs text-muted-foreground">Max file size 200MB</p>
                            </>
                          )}
                        </label>
                      </div>
                      {errors.pdf && (
                        <p className="text-sm text-destructive">{errors.pdf}</p>
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
                        disabled={createBook.isPending || isUploading}
                        className="gradient-primary min-w-[120px]"
                      >
                        {createBook.isPending || isUploading ? (
                          <div className="flex flex-col gap-1 items-center w-full">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {pdfProgress.status === 'idle' || pdfProgress.status === 'uploading' || pdfProgress.status === 'rendering'
                                ? `Processing ${pdfProgress.done}/${pdfProgress.total || '...'} pages`
                                : 'Uploading...'}
                            </div>
                            {pdfProgress.total > 0 && (
                              <Progress
                                value={(pdfProgress.done / pdfProgress.total) * 100}
                                className="h-2 w-full"
                              />
                            )}
                          </div>
                        ) : (
                          'Upload & Create'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-2">
            {books?.length || 0} books in library
          </p>
        </div>

        {/* Books display */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {filteredBooks?.map((book) => (
              <Card key={book.id} className="group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="aspect-[3/4] relative bg-slate-100">
                  {book.cover_url ? (
                    <img src={book.cover_url} className="w-full h-full object-cover" alt={book.title} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                      <BookOpen className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {getStatusBadge(book.status)}
                    <Badge variant="secondary" className="bg-white/90 text-[10px]">{GRADE_LABELS[book.grade_level]}</Badge>
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="icon" variant="secondary" onClick={() => navigate(`/read/${book.id}`)}>
                      <BookOpen className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => deleteBook.mutate(book.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  {editingTitleId === book.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-success"
                        onClick={() => {
                          updateBook.mutate({ id: book.id, title: tempTitle, gradeLevel: book.grade_level });
                          setEditingTitleId(null);
                        }}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setEditingTitleId(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-between cursor-pointer group/title"
                      onClick={() => {
                        setEditingTitleId(book.id);
                        setTempTitle(book.title);
                      }}
                    >
                      <h3 className="font-semibold text-sm truncate pr-2">{book.title}</h3>
                      <Edit2 className="w-3 h-3 opacity-0 group-hover/title:opacity-50" />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              {books && books.length > 0 ? (
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
                          {editingTitleId === book.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                className="h-8 w-48"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  updateBook.mutate({ id: book.id, title: tempTitle, gradeLevel: book.grade_level });
                                  setEditingTitleId(null);
                                }}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 group/title cursor-pointer" onClick={() => { setEditingTitleId(book.id); setTempTitle(book.title); }}>
                              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-primary" />
                              </div>
                              {book.title}
                              <Edit2 className="w-3 h-3 opacity-0 group-hover/title:opacity-50" />
                            </div>
                          )}
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
                              className="text-accent"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/read/${book.id}`)}
                              className="text-primary"
                            >
                              <BookOpen className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteBook.mutate(book.id)}
                              className="text-destructive"
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
                  <Button onClick={() => setIsDialogOpen(true)} className="gradient-primary mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Book
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
