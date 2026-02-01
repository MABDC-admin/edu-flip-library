import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Upload, Plus, Trash2, BookOpen, Loader2, Edit2, LayoutGrid, List, Check, X, Lock, Globe, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePdfToImages } from '@/hooks/usePdfToImages';
import { GRADE_LABELS, SUBJECT_LABELS, Book, BookWithProgress } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

const formSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    gradeLevel: z.number().min(1).max(12),
});

export default function AdminQuipper() {
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
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [bulkFiles, setBulkFiles] = useState<File[]>([]);
    const [bulkGrade, setBulkGrade] = useState<number>(1);
    const [bulkSubject, setBulkSubject] = useState<string>('Science');
    const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, currentTitle: '' });
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [tempTitle, setTempTitle] = useState('');
    const [subject, setSubject] = useState<string>('Science');
    // Quipper always default to teacher only and source quipper
    const [isTeacherOnly, setIsTeacherOnly] = useState(true);

    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: books, isLoading } = useQuery({
        queryKey: ['admin-quipper-books'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('books')
                .select('*')
                .eq('source', 'quipper') // Filter only Quipper
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data as any) as BookWithProgress[];
        },
    });

    const filteredBooks = books?.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesGrade = filterGrade === 'all' || book.grade_level === parseInt(filterGrade);
        return matchesSearch && matchesGrade;
    });

    // Group books by grade
    const groupedBooks = filteredBooks?.reduce((acc, book) => {
        const grade = book.grade_level;
        if (!acc[grade]) acc[grade] = [];
        acc[grade].push(book);
        return acc;
    }, {} as Record<number, Book[]>);

    const sortedGrades = groupedBooks ? Object.keys(groupedBooks).map(Number).sort((a, b) => a - b) : [];

    const updateBook = useMutation({
        mutationFn: async ({ id, title, gradeLevel, isTeacherOnly }: { id: string; title: string; gradeLevel: number; isTeacherOnly?: boolean }) => {
            const { data, error } = await supabase
                .from('books')
                .update({
                    title,
                    grade_level: gradeLevel,
                    ...(isTeacherOnly !== undefined && { is_teacher_only: isTeacherOnly })
                })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-quipper-books'] });
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
        subject: string,
        pdf: File,
        cover: File | null,
        isTeacherOnly: boolean = true
    ) => {
        const { data: book, error: bookError } = await supabase
            .from('books')
            .insert({
                title,
                grade_level: grade,
                subject,
                source: 'quipper', // Enforce Quipper source
                is_teacher_only: isTeacherOnly,
                status: 'processing',
                page_count: 0,
            })
            .select()
            .single();

        if (bookError) throw bookError;
        const bookId = book.id;

        const pdfPath = `${bookId}/source.pdf`;
        const { error: pdfUploadError } = await supabase.storage.from('pdf-uploads').upload(pdfPath, pdf);
        if (pdfUploadError) throw pdfUploadError;

        let coverUrl = null;
        if (cover) {
            const coverPath = `${bookId}/cover.png`;
            await supabase.storage.from('book-covers').upload(coverPath, cover);
            coverUrl = supabase.storage.from('book-covers').getPublicUrl(coverPath).data.publicUrl;
        }

        await supabase.from('books').update({ pdf_url: pdfPath }).eq('id', bookId);

        const { numPages, firstPageUrl } = await processInBrowser(bookId, pdf);

        await supabase.from('books').update({
            page_count: numPages,
            status: 'ready',
            cover_url: coverUrl || firstPageUrl,
        }).eq('id', bookId);

        return book;
    };

    const createBook = useMutation({
        mutationFn: async ({ title, gradeLevel, subject, pdfFile, coverFile, isTeacherOnly }: any) => {
            setIsUploading(true);
            try {
                return await uploadSingleBook(title, gradeLevel, subject, pdfFile, coverFile, isTeacherOnly);
            } finally {
                setIsUploading(false);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-quipper-books'] });
            setIsDialogOpen(false);
            resetForm();
            resetPdfProgress();
            toast({ title: 'Quipper module uploaded! 📚' });
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
                // Always Quipper, Always Teacher Only (default)
                await uploadSingleBook(title, bulkGrade, bulkSubject, file, null, true);
                setBulkProgress(p => ({ ...p, done: i + 1 }));
            } catch (err) {
                toast({ title: `Failed: ${title}`, variant: 'destructive' });
            }
        }

        setIsUploading(false);
        setIsBulkOpen(false);
        setBulkFiles([]);
        queryClient.invalidateQueries({ queryKey: ['admin-quipper-books'] });
        toast({ title: 'Bulk upload complete! 🚀' });
    };

    const deleteBook = useMutation({
        mutationFn: async (bookId: string) => {
            const { error } = await supabase.from('books').delete().eq('id', bookId);
            if (error) throw error;
            await supabase.storage.from('pdf-uploads').remove([`${bookId}/source.pdf`]).catch(console.error);
            await supabase.storage.from('book-covers').remove([`${bookId}/cover.png`]).catch(console.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-quipper-books'] });
            toast({ title: 'Quipper module deleted' });
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    const reprocessBook = useMutation({
        mutationFn: async (book: BookWithProgress) => {
            if (!book.pdf_url) throw new Error("No PDF found for this book");

            const { data, error } = await supabase.storage.from("pdf-uploads").download(book.pdf_url);
            if (error) throw error;

            const file = new File([data], "source.pdf", { type: "application/pdf" });
            await processInBrowser(book.id, file);

            // Ensure status is ready
            await supabase.from('books').update({ status: 'ready' }).eq('id', book.id);
        },
        onSuccess: () => {
            toast({ title: 'Book reprocessed successfully', description: 'Cover and pages have been regenerated.' });
            queryClient.invalidateQueries({ queryKey: ['admin-quipper-books'] });
        },
        onError: (error) => {
            toast({ title: 'Reprocess failed', description: error.message, variant: 'destructive' });
        }
    });

    const resetForm = () => {
        setTitle('');
        setGradeLevel(1);
        setSubject('Science');
        setPdfFile(null);
        setCoverFile(null);
        setErrors({});
        setIsTeacherOnly(true);
    };

    const openEditDialog = (book: Book) => {
        setEditingBook(book);
        setTitle(book.title);
        setGradeLevel(book.grade_level);
        setSubject(book.subject || 'Science');
        setIsTeacherOnly(book.is_teacher_only);
        setIsEditOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pdfFile) {
            setErrors({ pdf: 'PDF file is required' });
            return;
        }
        try {
            formSchema.parse({ title, gradeLevel });
            setErrors({});
            createBook.mutate({ title, gradeLevel, subject, pdfFile, coverFile, isTeacherOnly });
        } catch (error) {
            // Error handling same as Books.tsx
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
        <AdminLayout title="Quipper Modules">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex flex-1 gap-2 max-w-xl">
                        <div className="relative flex-1">
                            <Input placeholder="Search modules..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                            <BookOpen className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        </div>
                        <Select value={filterGrade} onValueChange={setFilterGrade}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Grades" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Grades</SelectItem>
                                {Object.entries(GRADE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                            </SelectContent>
                        </Select>

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
                                        <DialogTitle>Bulk Upload Quipper Modules</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label>Grade Level</Label>
                                            <Select value={bulkGrade.toString()} onValueChange={(val) => setBulkGrade(parseInt(val))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(GRADE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Subject</Label>
                                            <Select value={bulkSubject} onValueChange={setBulkSubject}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {SUBJECT_LABELS.map((subj) => <SelectItem key={subj} value={subj}>{subj}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                                            <input type="file" multiple accept=".pdf" onChange={(e) => setBulkFiles(Array.from(e.target.files || []))} className="hidden" id="bulk-pdf-q" />
                                            <label htmlFor="bulk-pdf-q" className="cursor-pointer">
                                                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                                <p className="text-sm font-medium">Select PDFs</p>
                                                <p className="text-xs text-muted-foreground">{bulkFiles.length} files</p>
                                            </label>
                                        </div>
                                        <Button onClick={handleBulkUpload} disabled={isUploading || bulkFiles.length === 0} className="w-full gradient-primary">
                                            {isUploading ? "Uploading..." : `Upload ${bulkFiles.length} Modules`}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gradient-primary" onClick={resetForm}><Plus className="w-4 h-4 mr-2" /> Add Module</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader><DialogTitle>Add Quipper Module</DialogTitle></DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label>Module Title</Label>
                                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Science 9 - Module 1" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Grade Level</Label>
                                            <Select value={gradeLevel.toString()} onValueChange={(v) => setGradeLevel(parseInt(v))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(GRADE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Subject</Label>
                                            <Select value={subject} onValueChange={setSubject}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {SUBJECT_LABELS.map((subj) => <SelectItem key={subj} value={subj}>{subj}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <Label className="text-sm font-medium">Teacher Only?</Label>
                                            <Switch checked={isTeacherOnly} onCheckedChange={setIsTeacherOnly} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>PDF File</Label>
                                            <Input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-4">
                                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                            <Button type="submit" disabled={createBook.isPending || isUploading} className="gradient-primary">
                                                {createBook.isPending || isUploading ? <Loader2 className="animate-spin" /> : 'Upload'}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="space-y-12">
                    {sortedGrades.map((grade) => (
                        <div key={grade} className="space-y-6">
                            <div className="flex items-center gap-4">
                                <h2 className="text-xl font-bold text-gradient whitespace-nowrap">{GRADE_LABELS[grade]}</h2>
                                <div className="h-px w-full bg-slate-200" />
                                <Badge variant="outline">{groupedBooks?.[grade].length} Modules</Badge>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                {groupedBooks?.[grade].map((book) => (
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
                                            </div>
                                            <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                                                {book.is_teacher_only && <div className="bg-amber-500/90 text-white rounded-full p-1 shadow-lg"><Lock className="w-3 h-3" /></div>}
                                            </div>
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <Button size="icon" variant="secondary" onClick={() => navigate(`/read/${book.id}`)}><BookOpen className="w-4 h-4" /></Button>
                                                <Button size="icon" variant="secondary" onClick={() => reprocessBook.mutate(book)}><RefreshCw className="w-4 h-4" /></Button>
                                                <Button size="icon" variant="secondary" onClick={() => openEditDialog(book)}><Edit2 className="w-4 h-4" /></Button>
                                                <Button size="icon" variant="destructive" onClick={() => deleteBook.mutate(book.id)}><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="font-semibold text-sm truncate" title={book.title}>{book.title}</h3>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
