import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Pencil, Trash2, Mail, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/types/database';

export default function AdminTeachers() {
    const { school } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // State
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Profile | null>(null);
    const [newTeacher, setNewTeacher] = useState({
        name: '',
        email: '',
        password: '',
    });
    const [editForm, setEditForm] = useState({ name: '', email: '' });

    // Fetch Teachers
    const { data: teachers, isLoading } = useQuery({
        queryKey: ['admin-teachers', school?.id],
        queryFn: async () => {
            if (!school?.id) return [];

            // Fetch profiles capable of being teachers (optimized query)
            // We need to check user_roles for 'teacher' role AND school_id match
            const { data: roleData, error: roleError } = await await supabase
                .from('user_roles')
                .select('user_id')
                .eq('school_id', school.id)
                .eq('role', 'teacher');

            if (roleError) throw roleError;

            const teacherIds = roleData.map(r => r.user_id);

            if (teacherIds.length === 0) return [];

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .in('id', teacherIds)
                .order('name');

            if (error) throw error;
            return data as Profile[];
        },
        enabled: !!school?.id
    });

    // Mutations
    const createTeacherMutation = useMutation({
        mutationFn: async (data: typeof newTeacher) => {
            // 1. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        name: data.name,
                        role: 'teacher',
                        school_id: school?.id,
                        academic_year_id: 2 // TODO: Fetch current from context, temporary fix
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Failed to create user");

            // 2. Insert into user_roles
            const { error: roleError } = await supabase.from('user_roles').insert({
                user_id: authData.user.id,
                role: 'teacher',
                school_id: school?.id
            });

            if (roleError) {
                // Determine if we need to rollback? For now just log
                
                throw roleError;
            }

            // 3. Update Profile (Trigger might handle this, but explicit update ensures name/school)
            const { error: profileError } = await supabase.from('profiles').update({
                school_id: school?.id,
                name: data.name
            }).eq('id', authData.user.id);

            
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
            setIsCreateDialogOpen(false);
            setNewTeacher({ name: '', email: '', password: '' });
            toast({ title: 'Teacher created successfully' });
        },
        onError: (error) => {
            toast({ title: 'Error creating teacher', description: error.message, variant: 'destructive' });
        }
    });

    const updateTeacherMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: typeof editForm }) => {
            // Update profile
            const { error } = await supabase.from('profiles').update({
                name: data.name,
                // Email update isn't simple in Supabase without reconfirmation, so we skip it for now or assume trigger handles it if auth updates
            }).eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
            setIsEditDialogOpen(false);
            toast({ title: 'Teacher updated' });
        },
        onError: (err) => {
            toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
        }
    });

    const removeTeacherMutation = useMutation({
        mutationFn: async (id: string) => {
            // Remove 'teacher' role for this school
            if (!school?.id) throw new Error('School not selected');
            const { error } = await supabase.from('user_roles').delete()
                .eq('user_id', id)
                .eq('school_id', school.id)
                .eq('role', 'teacher');
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
            toast({ title: 'Teacher removed from school' });
        },
        onError: (err) => {
            toast({ title: 'Deletion failed', description: err.message, variant: 'destructive' });
        }
    });

    // Handlers
    const handleEdit = (teacher: Profile) => {
        setEditingTeacher(teacher);
        setEditForm({ name: teacher.name || '', email: teacher.email || '' });
        setIsEditDialogOpen(true);
    };

    return (
        <AdminLayout title="">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Teachers</h2>
                    <p className="text-muted-foreground">Manage your school's faculty members.</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Teacher
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : teachers?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                        No teachers found. Add one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                teachers?.map((teacher) => (
                                    <TableRow key={teacher.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                {teacher.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{teacher.email}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(teacher)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                                    onClick={() => {
                                                        if (confirm("Are you sure you want to remove this teacher?")) {
                                                            removeTeacherMutation.mutate(teacher.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
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

            {/* Create Teacher Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Teacher</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input
                                value={newTeacher.name}
                                onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                                placeholder="e.g. Maria Santos"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                                type="email"
                                value={newTeacher.email}
                                onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                                placeholder="teacher@school.edu.ph"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Temporary Password</Label>
                            <Input
                                type="password"
                                value={newTeacher.password}
                                onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => createTeacherMutation.mutate(newTeacher)}
                            disabled={createTeacherMutation.isPending || !newTeacher.name || !newTeacher.email || !newTeacher.password}
                        >
                            {createTeacherMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Create Teacher
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Teacher Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Teacher</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                        </div>
                        {/* Email edit disabled for now as it affects Auth */}
                        <div className="space-y-2 opacity-50 cursor-not-allowed">
                            <Label>Email Address</Label>
                            <Input
                                value={editForm.email}
                                disabled
                                title="Contact Admin to change email"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => editingTeacher && updateTeacherMutation.mutate({ id: editingTeacher.id, data: editForm })}
                            disabled={updateTeacherMutation.isPending}
                        >
                            {updateTeacherMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
