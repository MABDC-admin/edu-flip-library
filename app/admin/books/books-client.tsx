'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBook, updateBook, deleteBook } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, ExternalLink, BookOpen, Loader2 } from 'lucide-react';
import type { Book } from '@prisma/client';

const GRADE_LABELS: Record<number, string> = {
    1: 'Grade 1',
    2: 'Grade 2',
    3: 'Grade 3',
    4: 'Grade 4',
    5: 'Grade 5',
    6: 'Grade 6',
    7: 'Grade 7',
    8: 'Grade 8',
    9: 'Grade 9',
    10: 'Grade 10',
    11: 'Grade 11',
    12: 'Grade 12',
};

interface BooksClientProps {
    initialBooks: Book[];
}

export function BooksClient({ initialBooks }: BooksClientProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGrade, setSelectedGrade] = useState<string>('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        gradeLevel: '',
        html5Url: ''
    });
    const [coverFile, setCoverFile] = useState<File | null>(null);

    // Filter books
    const filteredBooks = initialBooks.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesGrade = selectedGrade === 'all' || book.grade_level.toString() === selectedGrade;
        return matchesSearch && matchesGrade;
    });

    const resetForm = () => {
        setFormData({ title: '', gradeLevel: '', html5Url: '' });
        setCoverFile(null);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.gradeLevel || !formData.html5Url) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            let coverUrl = null;

            // Upload Cover if exists
            if (coverFile) {
                const uploadData = new FormData();
                uploadData.append('file', coverFile);

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadData,
                });

                const uploadJson = await uploadRes.json();
                if (!uploadRes.ok || !uploadJson.success) {
                    throw new Error(uploadJson.message || "Cover upload failed");
                }
                coverUrl = uploadJson.url;
            }

            // Create Book
            const result = await createBook({
                title: formData.title,
                gradeLevel: parseInt(formData.gradeLevel),
                html5Url: formData.html5Url,
                coverUrl: coverUrl || undefined
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            toast.success("Book created successfully");
            setIsDialogOpen(false);
            resetForm();
            router.refresh(); // Refresh Server Component data
        } catch (error: any) {
            toast.error(error.message || "Failed to create book");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this book?")) return;

        setIsDeleting(id);
        try {
            const result = await deleteBook(id);
            if (!result.success) throw new Error(result.error);

            toast.success("Book deleted");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete book");
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search books..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Grade" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Grades</SelectItem>
                            {Object.entries(GRADE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm} className="gap-2">
                            <Plus className="h-4 w-4" /> Add Book
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Book</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Book Title *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Mathematics Grade 10"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="grade">Grade Level *</Label>
                                <Select
                                    value={formData.gradeLevel}
                                    onValueChange={(value) => setFormData({ ...formData, gradeLevel: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(GRADE_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="html5url">HTML5 Flipbook URL *</Label>
                                <Input
                                    id="html5url"
                                    type="url"
                                    value={formData.html5Url}
                                    onChange={(e) => setFormData({ ...formData, html5Url: e.target.value })}
                                    placeholder="https://yourserver.com/books/grade1/index.html"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Direct URL to the index.html of the flipbook.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cover">Cover Image (Optional)</Label>
                                <Input
                                    id="cover"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Create Book'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Library Collection</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cover</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Grade</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBooks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No books found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredBooks.map((book) => (
                                    <TableRow key={book.id}>
                                        <TableCell>
                                            <div className="w-12 h-16 bg-muted rounded overflow-hidden relative">
                                                {book.cover_url ? (
                                                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                                        <BookOpen className="h-6 w-6" />
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{book.title}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{GRADE_LABELS[book.grade_level] || `Grade ${book.grade_level}`}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={book.status === 'ready' ? 'default' : 'secondary'}>
                                                {book.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {book.html5_url && (
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <a href={book.html5_url} target="_blank" rel="noopener noreferrer">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(book.id)}
                                                    disabled={isDeleting === book.id}
                                                >
                                                    {isDeleting === book.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
