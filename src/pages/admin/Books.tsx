import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Upload, Plus, Trash2, BookOpen, Loader2, LayoutGrid, List, School, Library, FileText, Pencil, Eye, RefreshCw } from 'lucide-react';
import { GradeSidebar } from '@/components/bookshelf/GradeSidebar';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePdfToImages } from '@/hooks/usePdfToImages';
import { GRADE_LABELS, Book, BookWithProgress } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';
import { cn } from '@/lib/utils';
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  gradeLevel: z.number().min(1).max(12),
});

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export default function AdminBooks() {
  const { profile, school } = useAuth();
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
  const [activeSubject, setActiveSubject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkGrade, setBulkGrade] = useState<number>(1);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, currentTitle: '' });
  // Unused state removed
  const [source, setSource] = useState<'internal' | 'quipper'>('internal');
  const [isTeacherOnly, setIsTeacherOnly] = useState(false);
  const [bulkSource, setBulkSource] = useState<'internal' | 'quipper'>('internal');
  const [bulkIsTeacherOnly, setBulkIsTeacherOnly] = useState(false);
  const [filterSource, setFilterSource] = useState<string>('all');

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteAnswer, setDeleteAnswer] = useState('');
  const [bookIdToDelete, setBookIdToDelete] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: books, isLoading } = useQuery({
    queryKey: ['admin-books', school?.id],
    queryFn: async () => {
      if (!school?.id) return [];
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .or(`school_id.eq.${school.id},school_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as any) as BookWithProgress[];
    },
    enabled: !!school?.id,
  });

  const normalizedActiveGrade = filterGrade === '12' ? 11 : (filterGrade === 'all' ? 'all' : parseInt(filterGrade));

  const filteredBooks = books?.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());

    // Normalize Grade 12 to 11 for filtering
    const bookGrade = book.grade_level;
    const matchesGrade = normalizedActiveGrade === 'all' ||
      (normalizedActiveGrade === 11 ? (bookGrade === 11 || bookGrade === 12) : bookGrade === normalizedActiveGrade);

    const matchesSource = filterSource === 'all'
      ? true
      : filterSource === 'internal'
        ? (!book.source || book.source.toLowerCase() === 'internal')
        : book.source?.toLowerCase() === filterSource.toLowerCase();

    const matchesSubject = activeSubject === 'all' || book.subject === activeSubject;

    return matchesSearch && matchesGrade && matchesSource && matchesSubject;
  });

  const schoolBooks = filteredBooks?.filter(b => b.school_id === school?.id) || [];
  const globalBooks = filteredBooks?.filter(b => !b.school_id) || [];

  const subjectsInActiveGrade = Array.from(new Set(filteredBooks?.map(b => b.subject || 'Uncategorized') || [])).sort();

  // Grouping logic for Admin
  const groupByProperty = (bookList: BookWithProgress[], prop: 'grade_level' | 'subject') => {
    return bookList.reduce((acc, book) => {
      const key = book[prop] || (prop === 'subject' ? 'Uncategorized' : 1);
      if (!acc[key]) acc[key] = [];
      acc[key].push(book);
      return acc;
    }, {} as Record<string | number, BookWithProgress[]>);
  };



  const activeGrouping = normalizedActiveGrade === 'all' ? 'grade_level' : 'subject';
  const schoolBooksGrouped = groupByProperty(schoolBooks, activeGrouping);
  const globalBooksGrouped = groupByProperty(globalBooks, activeGrouping);

  const schoolGroups = Object.keys(schoolBooksGrouped)
    .sort((a, b) => {
      if (activeGrouping === 'grade_level') return Number(b) - Number(a);
      return a.localeCompare(b);
    });

  const globalGroups = Object.keys(globalBooksGrouped)
    .sort((a, b) => {
      if (activeGrouping === 'grade_level') return Number(b) - Number(a);
      return a.localeCompare(b);
    });



  const updateBook = useMutation({
    mutationFn: async ({ id, title, gradeLevel, source, isTeacherOnly }: { id: string; title: string; gradeLevel: number; source?: string; isTeacherOnly?: boolean }) => {
      const { data, error } = await supabase
        .from('books')
        .update({
          title,
          grade_level: gradeLevel,
          ...(source && { source }),
          ...(isTeacherOnly !== undefined && { is_teacher_only: isTeacherOnly })
        })
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

  const uploadSingleBook = async (
    title: string,
    grade: number,
    pdf: File,
    cover: File | null,
    source: 'internal' | 'quipper' = 'internal',
    isTeacherOnly: boolean = false
  ) => {
    // 1. Create book record
    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        title,
        grade_level: grade,
        source,
        is_teacher_only: isTeacherOnly,
        status: 'processing',
        page_count: 0,
        school_id: school?.id,
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
    mutationFn: async ({
      title,
      gradeLevel,
      pdfFile,
      coverFile,
      source,
      isTeacherOnly
    }: {
      title: string;
      gradeLevel: number;
      pdfFile: File;
      coverFile: File | null;
      source: 'internal' | 'quipper';
      isTeacherOnly: boolean;
    }) => {
      setIsUploading(true);
      try {
        return await uploadSingleBook(title, gradeLevel, pdfFile, coverFile, source, isTeacherOnly);
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
  });

  const reprocessBook = useMutation({
    mutationFn: async (book: BookWithProgress) => {
      if (!book.pdf_url) throw new Error('No PDF URL found');

      toast({ title: 'Downloading PDF for reprocessing...' });

      const { data, error } = await supabase.storage
        .from('pdf-uploads')
        .download(book.pdf_url);

      if (error) throw error;

      const file = new File([data], 'reprocess.pdf', { type: 'application/pdf' });
      await supabase.from('books').update({ status: 'processing' }).eq('id', book.id);

      const { numPages, firstPageUrl } = await processInBrowser(book.id, file);

      await supabase.from('books').update({
        page_count: numPages,
        status: 'ready',
        cover_url: book.cover_url || firstPageUrl,
      }).eq('id', book.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      toast({ title: 'Book reprocessed! 🔄' });
    },
    onError: (error: any) => {
      toast({ title: 'Reprocess failed', description: error.message, variant: 'destructive' });
    }
  });

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;
    setIsUploading(true);
    setBulkProgress({ done: 0, total: bulkFiles.length, currentTitle: '' });

    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];
      const title = file.name.replace(/\.[^/.]+$/, ""); // Strip extension
      setBulkProgress((p: any) => ({ ...p, currentTitle: title }));

      try {
        await uploadSingleBook(title, bulkGrade, file, null, bulkSource, bulkIsTeacherOnly);
        setBulkProgress((p: any) => ({ ...p, done: i + 1 }));
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
    setSource('internal');
    setIsTeacherOnly(false);
  };

  const openEditDialog = (book: Book) => {
    setEditingBook(book);
    setTitle(book.title);
    setGradeLevel(book.grade_level);
    setSource(book.source);
    setIsTeacherOnly(book.is_teacher_only);
    setIsEditOpen(true);
  };

  const deleteBook = useMutation({
    mutationFn: async (bookId: string) => {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (error) throw error;

      
      
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      setIsDeleteOpen(false);
      setDeleteAnswer('');
      setBookIdToDelete(null);
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

  const confirmDelete = () => {
    if (deleteAnswer.toLowerCase() === 'banana' && bookIdToDelete) {
      deleteBook.mutate(bookIdToDelete);
    } else {
      toast({
        title: 'Incorrect Answer',
        description: 'Please answer the security question correctly to delete.',
        variant: 'destructive'
      });
    }
  };

  // Unused mutation removed

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
      createBook.mutate({ title, gradeLevel, pdfFile, coverFile, source, isTeacherOnly });
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

  // getStatusBadge removed (duplicate)

  return (
    <AdminLayout title="">
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
                {Object.entries(GRADE_LABELS)
                  .filter(([value]) => value !== '12')
                  .map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="internal">Internal Library</SelectItem>
                <SelectItem value="quipper">Quipper</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border">
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
                          {Object.entries(GRADE_LABELS)
                            .filter(([v]) => v !== '12')
                            .map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Content Source</Label>
                      <Select
                        value={bulkSource}
                        onValueChange={(val: 'internal' | 'quipper') => {
                          setBulkSource(val);
                          if (val === 'quipper') setBulkIsTeacherOnly(true);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal Library</SelectItem>
                          <SelectItem value="quipper">Quipper Content</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-dashed">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Teacher & Admin Only</Label>
                        <p className="text-xs text-muted-foreground">Hide these books from student bookshelves</p>
                      </div>
                      <Switch
                        checked={bulkIsTeacherOnly}
                        onCheckedChange={setBulkIsTeacherOnly}
                      />
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
                            {Object.entries(GRADE_LABELS)
                              .filter(([value]) => value !== '12')
                              .map(([value, label]) => (
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Content Source</Label>
                        <Select
                          value={source}
                          onValueChange={(val: 'internal' | 'quipper') => {
                            setSource(val);
                            // Auto-set teacher only for quipper
                            if (val === 'quipper') setIsTeacherOnly(true);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="internal">Internal Library</SelectItem>
                            <SelectItem value="quipper">Quipper Content</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-dashed h-[68px] mt-2">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">Teacher Only</Label>
                          <p className="text-[10px] text-muted-foreground leading-tight">Hide from students</p>
                        </div>
                        <Switch
                          checked={isTeacherOnly}
                          onCheckedChange={setIsTeacherOnly}
                        />
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
        </div>

        <div className="flex gap-6 lg:gap-8 mt-6">
          <GradeSidebar
            activeGrade={normalizedActiveGrade}
            onGradeChange={(grade) => setFilterGrade(grade.toString())}
            profile={profile}
            isAdmin={true}
          />

          <main className="flex-1 min-w-0">
            {/* Subject Folders */}
            <div className="flex flex-wrap gap-2.5 mb-8">
              <button
                onClick={() => setActiveSubject('all')}
                className={cn(
                  "px-6 py-2.5 rounded-2xl text-xs font-bold transition-all border shadow-sm",
                  activeSubject === 'all'
                    ? "bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-200"
                    : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
                )}
              >
                All Folders
              </button>
              {subjectsInActiveGrade.map((subj) => (
                <button
                  key={subj}
                  onClick={() => setActiveSubject(subj)}
                  className={cn(
                    "flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-xs font-bold transition-all border shadow-sm",
                    activeSubject === subj
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/10"
                      : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
                  )}
                >
                  <Folder className={cn("w-4 h-4", activeSubject === subj ? "fill-current" : "text-slate-200")} />
                  {subj}
                </button>
              ))}
            </div>

            {/* Books display */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {schoolGroups.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <School className="w-5 h-5 text-primary" />
                      School Library
                    </h3>
                    {viewMode === 'table' ? (
                      <div className="space-y-4">
                        {schoolGroups.map((group) => (
                          <div key={`school-group-${group}`} className="space-y-2">
                            <h3 className="font-semibold text-lg text-muted-foreground ml-1">
                              {activeGrouping === 'grade_level'
                                ? (GRADE_LABELS[group as unknown as keyof typeof GRADE_LABELS] || `Grade ${group}`)
                                : group
                              }
                            </h3>
                            <div className="bg-white rounded-md border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[80px]">Cover</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead className="text-center">Pages</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {schoolBooksGrouped[group]?.map((book: BookWithProgress) => (
                                    <TableRow key={book.id}>
                                      <TableCell>
                                        <div className="w-12 h-16 bg-slate-100 rounded overflow-hidden">
                                          {book.cover_url ? (
                                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                              <BookOpen className="h-6 w-6 text-slate-300" />
                                            </div>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {book.title}
                                        {book.is_teacher_only && (
                                          <Badge variant="secondary" className="ml-2 text-xs">
                                            Teacher Only
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="bg-slate-50">
                                          {book.source || 'General'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-center text-muted-foreground">{book.page_count || '—'}</TableCell>
                                      <TableCell className="text-center">
                                        <Badge className={
                                          book.status === 'ready' ? 'bg-emerald-500 hover:bg-emerald-600' :
                                            book.status === 'processing' ? 'bg-blue-500 hover:bg-blue-600' :
                                              'bg-amber-500 hover:bg-amber-600'
                                        }>
                                          {book.status === 'ready' ? 'Active' : book.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                          <Button variant="ghost" size="icon" onClick={() => navigate(`/reader/${book.id}`)} title="View Book">
                                            <Eye className="h-4 w-4 text-blue-500" />
                                          </Button>
                                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(book)} title="Edit Details">
                                            <Pencil className="h-4 w-4 text-slate-600" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => reprocessBook.mutate(book)}
                                            disabled={reprocessBook.isPending}
                                            title="Reprocess Thumbnails"
                                          >
                                            <RefreshCw className={cn("h-4 w-4 text-emerald-600", reprocessBook.isPending && "animate-spin")} />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => {
                                            setBookIdToDelete(book.id);
                                            setIsDeleteOpen(true);
                                          }} title="Delete Book">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {schoolGroups.map((group) => (
                          <div key={`school-group-grid-${group}`} className="space-y-4">
                            <h3 className="font-semibold text-lg text-muted-foreground border-b pb-2">
                              {activeGrouping === 'grade_level'
                                ? (GRADE_LABELS[group as unknown as keyof typeof GRADE_LABELS] || `Grade ${group}`)
                                : group
                              }
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                              {schoolBooksGrouped[group]?.map((book: BookWithProgress) => (
                                <Card key={book.id} className="group hover:shadow-lg transition-all duration-200 border-slate-200">
                                  <div className="aspect-[3/4] relative overflow-hidden bg-slate-100 rounded-t-lg">
                                    {book.cover_url ? (
                                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center flex-col gap-2 text-slate-400">
                                        <BookOpen className="h-12 w-12" />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    {book.is_teacher_only && (
                                      <div className="absolute top-2 right-2">
                                        <Badge variant="secondary" className="shadow-sm">Teacher Only</Badge>
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-3 space-y-2">
                                    <h4 className="font-semibold text-sm line-clamp-2 min-h-[2.5em] leading-snug" title={book.title}>
                                      {book.title}
                                    </h4>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        {book.page_count || 0} pgs
                                      </span>
                                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                        {book.source || 'General'}
                                      </Badge>
                                    </div>
                                    <div className="pt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button size="sm" variant="secondary" className="flex-1 h-8 text-xs gap-1.5" onClick={() => navigate(`/reader/${book.id}`)}>
                                        <Eye className="w-3 h-3" /> View
                                      </Button>
                                      <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => openEditDialog(book)} title="Edit">
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-8 w-8 p-0"
                                        onClick={() => reprocessBook.mutate(book)}
                                        disabled={reprocessBook.isPending}
                                        title="Reprocess"
                                      >
                                        <RefreshCw className={cn("h-3.5 w-3.5", reprocessBook.isPending && "animate-spin")} />
                                      </Button>
                                      <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => {
                                        setBookIdToDelete(book.id);
                                        setIsDeleteOpen(true);
                                      }} title="Delete">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {globalGroups.length > 0 && (
                  <div className="space-y-4 mt-8 pt-8 border-t">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Library className="w-5 h-5 text-purple-500" />
                      Shared / Global Library
                    </h3>
                    {viewMode === 'table' ? (
                      <div className="space-y-4">
                        {globalGroups.map((group) => (
                          <div key={`global-group-${group}`} className="space-y-2">
                            <h3 className="font-semibold text-lg text-muted-foreground ml-1">
                              {activeGrouping === 'grade_level'
                                ? (GRADE_LABELS[group as unknown as keyof typeof GRADE_LABELS] || `Grade ${group}`)
                                : group
                              }
                            </h3>
                            <div className="bg-white rounded-md border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[80px]">Cover</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead className="text-center">Pages</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {globalBooksGrouped[group]?.map((book: BookWithProgress) => (
                                    <TableRow key={book.id}>
                                      <TableCell>
                                        <div className="w-12 h-16 bg-slate-100 rounded overflow-hidden">
                                          {book.cover_url ? (
                                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                              <BookOpen className="h-6 w-6 text-slate-300" />
                                            </div>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {book.title}
                                        {book.is_teacher_only && (
                                          <Badge variant="secondary" className="ml-2 text-xs">
                                            Teacher Only
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="bg-slate-50">
                                          {book.source || 'General'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-center text-muted-foreground">{book.page_count || '—'}</TableCell>
                                      <TableCell className="text-center">
                                        <Badge className={
                                          book.status === 'ready' ? 'bg-emerald-500 hover:bg-emerald-600' :
                                            book.status === 'processing' ? 'bg-blue-500 hover:bg-blue-600' :
                                              'bg-amber-500 hover:bg-amber-600'
                                        }>
                                          {book.status === 'ready' ? 'Active' : book.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                          <Button variant="ghost" size="icon" onClick={() => navigate(`/reader/${book.id}`)} title="View Book">
                                            <Eye className="h-4 w-4 text-blue-500" />
                                          </Button>
                                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(book)} title="Edit Details">
                                            <Pencil className="h-4 w-4 text-slate-600" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => reprocessBook.mutate(book)}
                                            disabled={reprocessBook.isPending}
                                            title="Reprocess Thumbnails"
                                          >
                                            <RefreshCw className={cn("h-4 w-4 text-emerald-600", reprocessBook.isPending && "animate-spin")} />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => {
                                            setBookIdToDelete(book.id);
                                            setIsDeleteOpen(true);
                                          }} title="Delete Book">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {globalGroups.map((group) => (
                          <div key={`global-group-grid-${group}`} className="space-y-4">
                            <h3 className="font-semibold text-lg text-muted-foreground border-b pb-2">
                              {activeGrouping === 'grade_level'
                                ? (GRADE_LABELS[group as unknown as keyof typeof GRADE_LABELS] || `Grade ${group}`)
                                : group
                              }
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                              {globalBooksGrouped[group]?.map((book: BookWithProgress) => (
                                <Card key={book.id} className="group hover:shadow-lg transition-all duration-200 border-slate-200 bg-purple-50/20">
                                  <div className="aspect-[3/4] relative overflow-hidden bg-slate-100 rounded-t-lg">
                                    {book.cover_url ? (
                                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center flex-col gap-2 text-slate-400">
                                        <BookOpen className="h-12 w-12" />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                    {book.is_teacher_only && (
                                      <div className="absolute top-2 right-2">
                                        <Badge variant="secondary" className="shadow-sm">Teacher Only</Badge>
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-3 space-y-2">
                                    <h4 className="font-semibold text-sm line-clamp-2 min-h-[2.5em] leading-snug" title={book.title}>
                                      {book.title}
                                    </h4>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        {book.page_count || 0} pgs
                                      </span>
                                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                        Global
                                      </Badge>
                                    </div>
                                    <div className="pt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button size="sm" variant="secondary" className="flex-1 h-8 text-xs gap-1.5" onClick={() => navigate(`/reader/${book.id}`)}>
                                        <Eye className="w-3 h-3" /> View
                                      </Button>
                                      <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => openEditDialog(book)} title="Edit">
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-8 w-8 p-0"
                                        onClick={() => reprocessBook.mutate(book)}
                                        disabled={reprocessBook.isPending}
                                        title="Reprocess"
                                      >
                                        <RefreshCw className={cn("h-3.5 w-3.5", reprocessBook.isPending && "animate-spin")} />
                                      </Button>
                                      <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => {
                                        setBookIdToDelete(book.id);
                                        setIsDeleteOpen(true);
                                      }} title="Delete">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(!books || books.length === 0) ? (
                  <div className="p-12 text-center bg-white rounded-xl border border-dashed">
                    <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                    <h3 className="text-lg font-semibold mb-2">No books found</h3>
                    <p className="text-muted-foreground mb-6">Add your first book to get started!</p>
                    <Button onClick={() => setIsDialogOpen(true)} className="gradient-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Book
                    </Button>
                  </div>
                ) : filteredBooks?.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-xl border border-dashed">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No matches found</h3>
                    <p className="text-muted-foreground mb-6">Try adjusting your search or filters to see more books.</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterGrade('all');
                        setFilterSource('all');
                        setActiveSubject('all');
                      }}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                ) : null}
              </div>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Content Source</Label>
                      <Select
                        value={source}
                        onValueChange={(val: 'internal' | 'quipper') => {
                          setSource(val);
                          if (val === 'quipper') setIsTeacherOnly(true);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal Library</SelectItem>
                          <SelectItem value="quipper">Quipper Content</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-dashed col-span-2">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Teacher & Admin Only</Label>
                        <p className="text-xs text-muted-foreground">Hide this book from student bookshelves</p>
                      </div>
                      <Switch
                        checked={isTeacherOnly}
                        onCheckedChange={setIsTeacherOnly}
                      />
                    </div>
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
                        gradeLevel,
                        source,
                        isTeacherOnly
                      })}
                      disabled={updateBook.isPending}
                    >
                      {updateBook.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Security Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={(open) => {
              setIsDeleteOpen(open);
              if (!open) {
                setDeleteAnswer('');
                setBookIdToDelete(null);
              }
            }}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-destructive flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Confirm Deletion
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive font-medium">
                    Warning: This action is permanent and cannot be undone.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="security-question">Security Question: What is your favorite food?</Label>
                    <Input
                      id="security-question"
                      placeholder="Type your answer..."
                      value={deleteAnswer}
                      onChange={(e) => setDeleteAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && confirmDelete()}
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={confirmDelete}
                      disabled={deleteBook.isPending}
                    >
                      {deleteBook.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Delete'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </main >
        </div >
      </div >
    </AdminLayout >
  );
}
