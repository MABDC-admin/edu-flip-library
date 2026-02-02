import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Plus, Trash2, BookOpen, Loader2, Edit2, Lock, RefreshCw, ChevronRight, Folder } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePdfToImages } from '@/hooks/usePdfToImages';
import { useAuth } from '@/contexts/AuthContext';
import { GRADE_LABELS, SUBJECT_LABELS, Book, BookWithProgress } from '@/types/database';
import { cn } from '@/lib/utils';
import { z } from 'zod';



const formSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    gradeLevel: z.number().min(1).max(12),
});

export default function AdminQuipper() {
    const { school } = useAuth();
    const navigate = useNavigate();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | null>(null);
    const [title, setTitle] = useState('');
    const [gradeLevel, setGradeLevel] = useState<number>(1);
    const [activeGrade, setActiveGrade] = useState<number>(1);
    const [activeSubject, setActiveSubject] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [bulkFiles, setBulkFiles] = useState<File[]>([]);
    const [bulkGrade, setBulkGrade] = useState<number>(1);
    const [bulkSubject, setBulkSubject] = useState<string>('Science');
    const [bulkCustomSubject, setBulkCustomSubject] = useState('');
    const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, currentTitle: '' });
    const [subject, setSubject] = useState<string>('Science');
    const [customSubject, setCustomSubject] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Quipper always default to teacher only and source quipper
    const [isTeacherOnly, setIsTeacherOnly] = useState(true);

    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: books } = useQuery({
        queryKey: ['admin-quipper-books', school?.id],
        queryFn: async () => {
            if (!school?.id) return [];
            const { data, error } = await supabase
                .from('books')
                .select('*')
                .eq('source', 'quipper')
                .or(`school_id.eq.${school.id},school_id.is.null`)
                .order('title', { ascending: true });

            if (error) throw error;
            return (data as any) as BookWithProgress[];
        },
        enabled: !!school?.id
    });

    const filteredBooks = books?.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesGrade = book.grade_level === activeGrade;
        return matchesSearch && matchesGrade;
    });

    // Get unique subjects for the active grade
    const subjectsInActiveGrade = useMemo(() => {
        if (!filteredBooks) return [];
        const subjects = new Set<string>();
        filteredBooks.forEach(b => subjects.add(b.subject || 'Uncategorized'));
        return Array.from(subjects).sort();
    }, [filteredBooks]);

    // Apply subject filter if not 'all'
    const finalDisplayBooks = useMemo(() => {
        if (!filteredBooks) return [];
        if (activeSubject === 'all') return filteredBooks;
        return filteredBooks.filter(b => (b.subject || 'Uncategorized') === activeSubject);
    }, [filteredBooks, activeSubject]);

    // Group books by grade and then by subject (Still useful for deep data operations)




    const updateBook = useMutation({
        mutationFn: async ({ id, title, gradeLevel, subject, isTeacherOnly }: { id: string; title: string; gradeLevel: number; subject?: string; isTeacherOnly?: boolean }) => {
            const { data, error } = await supabase
                .from('books')
                .update({
                    title,
                    grade_level: gradeLevel,
                    subject,
                    is_teacher_only: isTeacherOnly
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

    const { processInBrowser, reset: resetPdfProgress } = usePdfToImages();

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
                school_id: school?.id,
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
            queryClient.invalidateQueries({ queryKey: ['admin-quipper-books', school?.id] });
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
                // Determine final subject
                const finalSubject = bulkSubject === 'Other' ? bulkCustomSubject : bulkSubject;

                // Always Quipper, Always Teacher Only (default)
                await uploadSingleBook(title, bulkGrade, finalSubject, file, null, true);
                setBulkProgress(p => ({ ...p, done: i + 1 }));
            } catch (err) {
                toast({ title: `Failed: ${title}`, variant: 'destructive' });
            }
        }

        setIsUploading(false);
        setIsBulkOpen(false);
        setBulkFiles([]);
        queryClient.invalidateQueries({ queryKey: ['admin-quipper-books', school?.id] });
        toast({ title: 'Bulk upload complete! 🚀' });
    };

    const deleteBook = useMutation({
        mutationFn: async (bookId: string) => {
            const { error } = await supabase.from('books').delete().eq('id', bookId);
            if (error) throw error;
            
            
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-quipper-books', school?.id] });
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
            queryClient.invalidateQueries({ queryKey: ['admin-quipper-books', school?.id] });
        },
        onError: (error) => {
            toast({ title: 'Reprocess failed', description: error.message, variant: 'destructive' });
        }
    });

    const resetForm = () => {
        setTitle('');
        setGradeLevel(1);
        setSubject('Science');
        setCustomSubject('');
        setPdfFile(null);
        setCoverFile(null);
        setErrors({});
        setIsTeacherOnly(true);
    };

    const openEditDialog = (book: Book) => {
        setEditingBook(book);
        setTitle(book.title);
        setGradeLevel(book.grade_level);
        // If subject is in labels, select it, otherwise set 'Other' and fill custom
        const isStandard = SUBJECT_LABELS.includes(book.subject as any);
        setSubject(isStandard ? book.subject! : 'Other');
        setCustomSubject(isStandard ? '' : book.subject || '');

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

            const finalSubject = subject === 'Other' ? customSubject : subject;
            createBook.mutate({ title, gradeLevel, subject: finalSubject, pdfFile, coverFile, isTeacherOnly });
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
        <AdminLayout title="">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex flex-1 gap-2 max-w-xl">
                        <div className="relative flex-1">
                            <Input placeholder="Search modules in this grade..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                            <BookOpen className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
                                        <DialogTitle>Bulk Upload Quipper Modules</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                        {isUploading && (
                                            <div className="space-y-2 mb-4">
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-primary animate-pulse">Processing: {bulkProgress.currentTitle}</span>
                                                    <span>{bulkProgress.done} / {bulkProgress.total}</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary transition-all duration-300"
                                                        style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
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
                                        {bulkSubject === 'Other' && (
                                            <div className="space-y-2">
                                                <Label>Custom Subject Name</Label>
                                                <Input
                                                    value={bulkCustomSubject}
                                                    onChange={(e) => setBulkCustomSubject(e.target.value)}
                                                    placeholder="Enter subject name"
                                                />
                                            </div>
                                        )}
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
                                        {subject === 'Other' && (
                                            <div className="space-y-2">
                                                <Label>Custom Subject Name</Label>
                                                <Input
                                                    value={customSubject}
                                                    onChange={(e) => setCustomSubject(e.target.value)}
                                                    placeholder="Enter subject name"
                                                />
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <Label className="text-sm font-medium">Teacher Only?</Label>
                                            <Switch checked={isTeacherOnly} onCheckedChange={setIsTeacherOnly} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>PDF File</Label>
                                            <Input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                                            {errors.pdf && <p className="text-[10px] text-red-500 font-bold">{errors.pdf}</p>}
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
                    </div >
                </div >

                <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
                    {/* Level 1: Grade Sidebar */}
                    <div className="space-y-4">
                        <div className="px-3 py-2">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">Grade Levels</h3>
                            <nav className="space-y-1">
                                {Object.entries(GRADE_LABELS).map(([grade, label]) => {
                                    const gradeNum = parseInt(grade);
                                    const isActive = activeGrade === gradeNum;
                                    return (
                                        <button
                                            key={grade}
                                            onClick={() => {
                                                setActiveGrade(gradeNum);
                                                setActiveSubject('all');
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group",
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                                                    : "hover:bg-slate-100 text-slate-600"
                                            )}
                                        >
                                            <span className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    isActive ? "bg-white" : "bg-slate-300 group-hover:bg-primary/50"
                                                )} />
                                                {label}
                                            </span>
                                            {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Level 2 & 3: Subjects and Content */}
                    <div className="space-y-8 bg-slate-50/50 rounded-3xl p-6 lg:p-8 border border-white min-h-[600px]">
                        <div className="space-y-6">
                            {/* Subject Folders (Tabs Style) */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setActiveSubject('all')}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                                        activeSubject === 'all'
                                            ? "bg-slate-900 text-white border-slate-900 shadow-md"
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
                                            "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border",
                                            activeSubject === subj
                                                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                                                : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
                                        )}
                                    >
                                        <Folder className={cn("w-3.5 h-3.5", activeSubject === subj ? "fill-white/20" : "fill-slate-100")} />
                                        {subj}
                                    </button>
                                ))}
                            </div>

                            {/* Heading for Active Selection */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        {GRADE_LABELS[activeGrade]}
                                        {activeSubject !== 'all' && (
                                            <>
                                                <ChevronRight className="w-4 h-4 text-slate-300" />
                                                <span className="text-primary">{activeSubject}</span>
                                            </>
                                        )}
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium tracking-tight">
                                        {finalDisplayBooks.length} Modules available in this section
                                    </p>
                                </div>
                            </div>

                            {/* Level 3: Content Grid */}
                            {finalDisplayBooks.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 items-stretch">
                                    {finalDisplayBooks.map((book) => (
                                        <Card key={book.id} className="group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 border-slate-100 shadow-sm bg-white h-full flex flex-col">
                                            <div className="aspect-[3/4] relative bg-slate-50">
                                                {book.cover_url ? (
                                                    <img src={book.cover_url} className="w-full h-full object-cover" alt={book.title} />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center text-slate-200">
                                                        <BookOpen className="w-12 h-12" />
                                                    </div>
                                                )}
                                                <div className="absolute top-2 left-2 flex gap-1">
                                                    {getStatusBadge(book.status)}
                                                </div>
                                                <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                                                    {book.is_teacher_only && (
                                                        <div className="bg-amber-500/90 text-white rounded-full p-1.5 shadow-lg backdrop-blur-sm">
                                                            <Lock className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                                    <Button size="icon" variant="secondary" className="rounded-full w-9 h-9" onClick={() => navigate(`/read/${book.id}`)}>
                                                        <BookOpen className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="secondary" className="rounded-full w-9 h-9" onClick={() => reprocessBook.mutate(book)}>
                                                        <RefreshCw className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="secondary" className="rounded-full w-9 h-9" onClick={() => openEditDialog(book)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="destructive" className="rounded-full w-9 h-9" onClick={() => deleteBook.mutate(book.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="p-3 flex-grow flex flex-col">
                                                <h3 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight h-[2.5rem] overflow-hidden flex items-start mt-0.5" title={book.title}>{book.title}</h3>
                                                <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wider">{book.subject || 'General'}</p>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-200">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <Folder className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h4 className="text-slate-900 font-bold mb-1">No modules found</h4>
                                    <p className="text-slate-500 text-xs">There are no Quipper modules for this selection.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Quipper Module</DialogTitle>
                    </DialogHeader>
                    {editingBook && (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const finalSubject = subject === 'Other' ? customSubject : subject;
                            updateBook.mutate({
                                id: editingBook.id,
                                title,
                                gradeLevel,
                                subject: finalSubject,
                                isTeacherOnly
                            });
                        }} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Module Title</Label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <Label className="text-sm font-medium">Teacher Only?</Label>
                                <Switch checked={isTeacherOnly} onCheckedChange={setIsTeacherOnly} />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={updateBook.isPending} className="gradient-primary">
                                    {updateBook.isPending ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AdminLayout >
    );
}
