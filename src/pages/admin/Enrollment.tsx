import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AdminEnrollment() {
    const { school, academicYear } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [selectedEnrollment, setSelectedEnrollment] = useState<any | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Fetch Enrollments
    const { data: enrollments, isLoading } = useQuery({
        queryKey: ['admin-enrollments', school?.id, academicYear?.id],
        queryFn: async () => {
            if (!school?.id || !academicYear?.id) return [];
            const { data, error } = await (supabase as any)
                .from('enrollments')
                .select('*')
                .eq('school_id', school.id)
                .eq('academic_year_id', academicYear.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!school?.id && !!academicYear?.id
    });

    // Approve Mutation
    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            const enrollment = enrollments?.find((e: any) => e.id === id);
            if (!enrollment) throw new Error("Enrollment not found");

            // 1. Create/Update Profile (Simple version: create placeholder profile if not exists)
            // Ideally, we check email. For now, we just approve the status.
            // Real implementation would involve creating a user account or linking to one.

            const { error } = await (supabase as any)
                .from('enrollments')
                .update({ status: 'approved' })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
            setIsDetailsOpen(false);
            toast({ title: 'Enrollment Approved' });
        },
        onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
    });

    // Reject Mutation
    const rejectMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from('enrollments')
                .update({ status: 'rejected' })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-enrollments'] });
            setIsDetailsOpen(false);
            toast({ title: 'Enrollment Rejected' });
        },
        onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
    });

    return (
        <AdminLayout title="">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Enrollment Applications</h2>
                    <p className="text-muted-foreground">Review incoming student enrollments.</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Learner Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                            ) : enrollments?.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No applications found.</TableCell></TableRow>
                            ) : (
                                enrollments?.map((app: any) => (
                                    <TableRow key={app.id}>
                                        <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{app.form_data?.learner?.name}</TableCell>
                                        <TableCell>{app.form_name}</TableCell>
                                        <TableCell>
                                            <Badge variant={app.status === 'approved' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'}>
                                                {app.status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm" onClick={() => { setSelectedEnrollment(app); setIsDetailsOpen(true); }}>
                                                Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Application Details</DialogTitle>
                        <DialogDescription>submitted on {selectedEnrollment && new Date(selectedEnrollment.created_at).toLocaleString()}</DialogDescription>
                    </DialogHeader>

                    {selectedEnrollment && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
                                <h3 className="col-span-2 font-bold mb-2">Learner</h3>
                                <div>
                                    <span className="text-muted-foreground text-xs uppercase">Name</span>
                                    <p>{selectedEnrollment.form_data.learner.name}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground text-xs uppercase">Age / DOB</span>
                                    <p>{selectedEnrollment.form_data.learner.age} yo ({selectedEnrollment.form_data.learner.dob})</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-muted-foreground text-xs uppercase">UAE Address</span>
                                    <p>{selectedEnrollment.form_data.learner.address_uae}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
                                <h3 className="col-span-2 font-bold mb-2">Parents</h3>
                                <div>
                                    <span className="text-muted-foreground text-xs uppercase">Father</span>
                                    <p>{selectedEnrollment.form_data.parents.father.name}</p>
                                    <p className="text-sm text-muted-foreground">{selectedEnrollment.form_data.parents.father.contact}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground text-xs uppercase">Mother</span>
                                    <p>{selectedEnrollment.form_data.parents.mother.name}</p>
                                    <p className="text-sm text-muted-foreground">{selectedEnrollment.form_data.parents.mother.contact}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:justify-end">
                        {selectedEnrollment?.status === 'pending' && (
                            <>
                                <Button variant="destructive" onClick={() => rejectMutation.mutate(selectedEnrollment.id)} disabled={rejectMutation.isPending}>
                                    Reject Application
                                </Button>
                                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approveMutation.mutate(selectedEnrollment.id)} disabled={approveMutation.isPending}>
                                    Approve & Process
                                </Button>
                            </>
                        )}
                        <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
