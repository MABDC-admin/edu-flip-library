import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Trash2, Edit } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { School } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function AdminSchools() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', short_name: '', slug: '', logo_url: '' });

    const handleNameChange = (name: string) => {
        const slug = name.toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        setFormData({ ...formData, name, slug });
    };

    const { data: schools } = useQuery({
        queryKey: ['schools'],
        queryFn: async () => {
            const { data } = await (supabase as any).from('schools').select('*').order('name');
            return data as unknown as School[];
        }
    });

    const createMutation = useMutation({
        mutationFn: async (newSchool: any) => {
            const { error } = await (supabase as any).from('schools').insert(newSchool);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schools'] });
            setIsDialogOpen(false);
            setFormData({ name: '', short_name: '', slug: '', logo_url: '' });
            toast({ title: 'Success', description: 'School created successfully.' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any).from('schools').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schools'] });
            toast({ title: 'Success', description: 'School deleted.' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    });

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <AdminLayout title="Manage Schools">
            <div className="space-y-6">
                <div className="flex justify-end">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gradient-primary gap-2">
                                <Plus className="w-4 h-4" />
                                Add School
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New School</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>School Name</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        placeholder="e.g. M.A Brain Development Center"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Short Name</Label>
                                        <Input
                                            value={formData.short_name}
                                            onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                                            placeholder="e.g. MABDC"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Slug (identifier)</Label>
                                        <Input
                                            value={formData.slug}
                                            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                            placeholder="e.g. mabdc"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Logo URL</Label>
                                    <Input
                                        value={formData.logo_url}
                                        onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={() => createMutation.mutate(formData)}
                                    disabled={createMutation.isPending || !formData.slug || !formData.name}
                                >
                                    {createMutation.isPending ? 'Creating...' : 'Create School'}
                                </Button>
                                {!formData.slug && formData.name && (
                                    <p className="text-[10px] text-destructive text-center">Slug is required to prevent duplicate errors.</p>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {schools?.map((school) => (
                        <Card key={school.id} className="overflow-hidden">
                            <div className="h-32 bg-slate-50 flex items-center justify-center p-6 grayscale opacity-80 border-b">
                                <img src={school.logo_url || '/logo.jpg'} alt="" className="max-h-full object-contain" />
                            </div>
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">{school.name}</h3>
                                        <p className="text-sm text-muted-foreground font-mono">{school.slug}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="w-4 h-4" /></Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => handleDelete(school.id, school.name)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {schools?.length === 0 && (
                        <div className="col-span-full py-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                <Building2 className="w-8 h-8" />
                            </div>
                            <p className="text-muted-foreground">No schools registered yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
