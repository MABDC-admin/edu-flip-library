import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Shield, UserCog, GraduationCap, Trash2, KeyRound } from 'lucide-react';
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
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [newPassword, setNewPassword] = useState('');

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

    const deleteUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            // Note: Supabase Admin API is needed to deleting auth user, but we can delete profile.
            // However, configured cascading deletes on auth.users -> public.profiles is typical.
            // Client-side, we can only request to delete from 'profiles' if RLS allows, 
            // OR use a function.
            // IF we are avoiding Edge Functions, we can try deleting the profile row.
            // A trigger or foreign key constraint is often used to cleanup.

            // NOTE FOR USER: This attempts to delete the profile. To fully delete the Auth User without Edge Functions,
            // the user must delete their own account, OR we need the Edge Function.
            // I will implement Profile delete here, which usually soft-locks the account if the app relies on profiles.

            const { error } = await supabase.from('profiles').delete().eq('id', userId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
            toast({ title: 'User profile deleted' });
        },
        onError: (error) => {
            toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
        }
    });

    const resetPasswordMutation = useMutation({
        mutationFn: async ({ userId, password }: { userId: string, password: string }) => {
            const { data, error } = await supabase.functions.invoke('admin-update-user', {
                body: { userId, newPassword: password }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);
        },
        onSuccess: () => {
            setIsResetDialogOpen(false);
            setNewPassword('');
            toast({ title: 'Password reset successfully' });
        },
        onError: (error) => {
            toast({ title: 'Reset failed', description: error.message, variant: 'destructive' });
        }
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
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(user)}>Edit Roles</Button>
                                            <Button variant="ghost" size="icon" title="Reset Password" onClick={() => {
                                                setEditingUser(user);
                                                setNewPassword('');
                                                setIsResetDialogOpen(true);
                                            }}>
                                                <KeyRound className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => {
                                                if (confirm('Are you sure you want to delete this user? This cannot be undone.')) {
                                                    deleteUserMutation.mutate(user.id);
                                                }
                                            }}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
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

            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password for {editingUser?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min. 6 chars)"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => editingUser && resetPasswordMutation.mutate({ userId: editingUser.id, password: newPassword })}
                            disabled={resetPasswordMutation.isPending || newPassword.length < 6}
                        >
                            {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
