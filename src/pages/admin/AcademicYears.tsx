import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AcademicYear } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export default function AdminAcademicYears() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({ label: '', start_date: '', end_date: '', is_active: false });

    const { data: years } = useQuery({
        queryKey: ['academic-years'],
        queryFn: async () => {
            const { data } = await (supabase as any).from('academic_years').select('*').order('start_date', { ascending: false });
            return data as unknown as AcademicYear[];
        }
    });

    const createMutation = useMutation({
        mutationFn: async (newYear: any) => {
            const { error } = await (supabase as any).from('academic_years').insert(newYear);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['academic-years'] });
            setIsDialogOpen(false);
            setFormData({ label: '', start_date: '', end_date: '', is_active: false });
            toast({ title: 'Success', description: 'Academic year created.' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    });

    return (
        <AdminLayout title="Academic Years">
            <div className="space-y-6">
                <div className="flex justify-end">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gradient-primary gap-2">
                                <Plus className="w-4 h-4" />
                                Add Year
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Academic Year</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>Label</Label>
                                    <Input
                                        value={formData.label}
                                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                        placeholder="e.g. 2026-2027"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Start Date</Label>
                                        <Input
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End Date</Label>
                                        <Input
                                            type="date"
                                            value={formData.end_date}
                                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border p-3 rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label>Set as Active</Label>
                                        <p className="text-xs text-muted-foreground italic">Current term for enrollment</p>
                                    </div>
                                    <Switch
                                        checked={formData.is_active}
                                        onCheckedChange={(val) => setFormData({ ...formData, is_active: val })}
                                    />
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={() => createMutation.mutate(formData)}
                                    disabled={createMutation.isPending}
                                >
                                    {createMutation.isPending ? 'Saving...' : 'Save Year'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="space-y-4">
                    {years?.map((year) => (
                        <Card key={year.id} className={year.is_active ? "border-primary bg-primary/5" : ""}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${year.is_active ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-400'}`}>
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg">{year.label}</h3>
                                            {year.is_active && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">ACTIVE</span>}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {year.start_date || 'N/A'} — {year.end_date || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
