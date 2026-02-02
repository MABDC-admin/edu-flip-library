import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, GraduationCap, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EnrollmentForm } from '@/components/enrollment/EnrollmentForm';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function AdminEnrollment() {
    const { school } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data: enrollments, isLoading } = useQuery({
        queryKey: ['admin-enrollments', school?.id],
        queryFn: async () => {
            if (!school?.id) return [];
            const { data, error } = await (supabase as any)
                .from('enrollments')
                .select(`
                    id,
                    status,
                    created_at,
                    form_name,
                    form_data,
                    profiles:profile_id (
                        name,
                        email
                    )
                `)
                .eq('school_id', school.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!school?.id
    });

    const filteredEnrollments = enrollments?.filter((enrollment: any) => {
        const name = enrollment.form_data?.student_name || enrollment.profiles?.name || 'Unknown';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <AdminLayout title="Registrar & Enrollment">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 max-w-md relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search applications..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="gap-2">
                            <Filter className="w-4 h-4" />
                            Filter
                        </Button>

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="gradient-primary gap-2">
                                    <Plus className="w-4 h-4" />
                                    New Enrollment
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>New Student Enrollment</DialogTitle>
                                </DialogHeader>
                                <EnrollmentForm onSuccess={() => setIsDialogOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : filteredEnrollments && filteredEnrollments.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student Name</TableHead>
                                        <TableHead>Form Type</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEnrollments.map((enrollment: any) => (
                                        <TableRow key={enrollment.id}>
                                            <TableCell className="font-medium">
                                                {enrollment.form_data?.student_name || enrollment.profiles?.name || 'Unknown'}
                                            </TableCell>
                                            <TableCell>{enrollment.form_name}</TableCell>
                                            <TableCell>
                                                <Badge variant={enrollment.status === 'approved' ? 'default' : 'secondary'}>
                                                    {enrollment.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(enrollment.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm">View</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                    <GraduationCap className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold">No Enrollments Found</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    Start by creating a new enrollment or wait for students to submit their applications.
                                </p>
                                <Button variant="outline" className="mt-6" onClick={() => setIsDialogOpen(true)}>
                                    Click "New Enrollment" to start
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
