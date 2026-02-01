import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, UserCog, GraduationCap } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types/database';

interface UserRole {
    user_id: string;
    role: 'admin' | 'teacher' | 'student';
}

export default function AdminUsers() {
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: profiles, isLoading: profilesLoading } = useQuery({
        queryKey: ['admin-profiles'],
        queryFn: async () => {
            const { data, error } = await supabase.from('profiles').select('*').order('name');
            if (error) throw error;
            return data as Profile[];
        },
    });

    const { data: roles, isLoading: rolesLoading } = useQuery({
        queryKey: ['admin-roles'],
        queryFn: async () => {
            const { data, error } = await supabase.from('user_roles').select('*');
            if (error) throw error;
            return data as UserRole[];
        },
    });

    const isLoading = profilesLoading || rolesLoading;

    const getUserRoles = (userId: string) => {
        return roles?.filter(r => r.user_id === userId).map(r => r.role) || [];
    };

    const handleEditClick = (user: Profile) => {
        setEditingUser(user);
        setSelectedRoles(getUserRoles(user.id));
        setIsDialogOpen(true);
    };

    const updateRolesMutation = useMutation({
        mutationFn: async ({ userId, newRoles }: { userId: string, newRoles: string[] }) => {
            const currentRoles = getUserRoles(userId);

            // Calculate additions and removals
            const toAdd = newRoles.filter(r => !currentRoles.includes(r as any));
            const toRemove = currentRoles.filter(r => !newRoles.includes(r));

            // Execute updates
            if (toAdd.length > 0) {
                const { error } = await supabase.from('user_roles').insert(
                    toAdd.map(role => ({ user_id: userId, role: role as 'student' | 'teacher' | 'admin' }))
                );
                if (error) throw error;
            }

            if (toRemove.length > 0) {
                const { error } = await supabase.from('user_roles').delete()
                    .eq('user_id', userId)
                    .in('role', toRemove);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
            setIsDialogOpen(false);
            toast({ title: 'Roles updated successfully' });
        },
        onError: (error) => {
            toast({ title: 'Error updating roles', description: error.message, variant: 'destructive' });
        },
    });

    return (
        <AdminLayout title="Manage Users">
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Grade</TableHead>
                                <TableHead>Roles</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></TableCell></TableRow>
                            ) : profiles?.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.grade_level}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {getUserRoles(user.id).includes('admin') && <Badge variant="destructive" className="gap-1"><Shield className="w-3 h-3" /> Admin</Badge>}
                                            {getUserRoles(user.id).includes('teacher') && <Badge variant="secondary" className="gap-1"><UserCog className="w-3 h-3" /> Teacher</Badge>}
                                            {getUserRoles(user.id).includes('student') && <Badge variant="outline" className="gap-1"><GraduationCap className="w-3 h-3" /> Student</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(user)}>Edit Roles</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Roles for {editingUser?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="role-student" checked={selectedRoles.includes('student')}
                                onCheckedChange={(c) => {
                                    if (c) setSelectedRoles([...selectedRoles, 'student']);
                                    else setSelectedRoles(selectedRoles.filter(r => r !== 'student'));
                                }}
                            />
                            <Label htmlFor="role-student">Student</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="role-teacher" checked={selectedRoles.includes('teacher')}
                                onCheckedChange={(c) => {
                                    if (c) setSelectedRoles([...selectedRoles, 'teacher']);
                                    else setSelectedRoles(selectedRoles.filter(r => r !== 'teacher'));
                                }}
                            />
                            <Label htmlFor="role-teacher">Teacher</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="role-admin" checked={selectedRoles.includes('admin')}
                                onCheckedChange={(c) => {
                                    if (c) setSelectedRoles([...selectedRoles, 'admin']);
                                    else setSelectedRoles(selectedRoles.filter(r => r !== 'admin'));
                                }}
                            />
                            <Label htmlFor="role-admin">Admin</Label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => editingUser && updateRolesMutation.mutate({ userId: editingUser.id, newRoles: selectedRoles })} disabled={updateRolesMutation.isPending}>
                            {updateRolesMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
