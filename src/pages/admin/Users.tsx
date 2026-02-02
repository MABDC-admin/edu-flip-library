import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Shield, UserCog, GraduationCap, Trash2, KeyRound, Filter, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GRADE_LABELS } from '@/types/database';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Profile, Book } from '@/types/database';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserRole {
    user_id: string;
    role: 'admin' | 'teacher' | 'student';
}

export default function AdminUsers() {
    const { school } = useAuth();
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [newPassword, setNewPassword] = useState('');
    const [filterGrade, setFilterGrade] = useState<string>('all');
    const [selectedBooks, setSelectedBooks] = useState<string[]>([]);

    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: profiles, isLoading: profilesLoading } = useQuery({
        queryKey: ['admin-profiles', school?.id],
        queryFn: async () => {
            if (!school?.id) return [];
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('school_id', school.id)
                .order('name');
            if (error) throw error;
            return data as Profile[];
        },
        enabled: !!school?.id
    });

    const { data: roles, isLoading: rolesLoading } = useQuery({
        queryKey: ['admin-roles', school?.id],
        queryFn: async () => {
            if (!school?.id) return [];
            const { data, error } = await (supabase as any)
                .from('user_roles')
                .select('*')
                .eq('school_id', school.id);
            if (error) throw error;
            return data as UserRole[];
        },
        enabled: !!school?.id
    });

    const isLoading = profilesLoading || rolesLoading;

    const getUserRoles = (userId: string) => {
        return roles?.filter(r => r.user_id === userId).map(r => r.role) || [];
    };

    const { data: allShsBooks } = useQuery({
        queryKey: ['admin-shs-books', school?.id],
        queryFn: async () => {
            if (!school?.id) return [];
            const { data, error } = await supabase.from('books')
                .select('*')
                .in('grade_level', [11, 12])
                .eq('status', 'ready')
                .eq('school_id', school.id)
                .order('title');
            if (error) throw error;
            return (data as any) as Book[];
        },
        enabled: !!school?.id
    });

    const { data: userAssignments } = useQuery({
        queryKey: ['admin-user-assignments', editingUser?.id],
        enabled: !!editingUser && isAssignDialogOpen,
        queryFn: async () => {
            const { data, error } = await supabase.from('user_assigned_books' as any)
                .select('book_id')
                .eq('user_id', editingUser?.id);
            if (error) throw error;
            return (data as any[]).map(d => d.book_id);
        },
    });

    const assignBooksMutation = useMutation({
        mutationFn: async ({ userId, bookIds }: { userId: string, bookIds: string[] }) => {
            const currentAssignments = userAssignments || [];
            const toAdd = bookIds.filter(id => !currentAssignments.includes(id));
            const toRemove = currentAssignments.filter(id => !bookIds.includes(id));

            if (toAdd.length > 0) {
                const { error } = await supabase.from('user_assigned_books' as any).insert(
                    toAdd.map(bookId => ({ user_id: userId, book_id: bookId }))
                );
                if (error) throw error;
            }

            if (toRemove.length > 0) {
                const { error } = await supabase.from('user_assigned_books' as any).delete()
                    .eq('user_id', userId)
                    .in('book_id', toRemove);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-user-assignments'] });
            setIsAssignDialogOpen(false);
            toast({ title: 'Book assignments updated' });
        },
        onError: (error) => {
            toast({ title: 'Error assigning books', description: error.message, variant: 'destructive' });
        },
    });


    useEffect(() => {
        if (userAssignments && isAssignDialogOpen) {
            setSelectedBooks(userAssignments);
        }
    }, [userAssignments, isAssignDialogOpen]);

    const filteredProfiles = profiles?.filter(user => {
        if (filterGrade === 'all') return true;
        return user.grade_level === parseInt(filterGrade);
    }) || [];

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
            queryClient.invalidateQueries({ queryKey: ['admin-roles', school?.id] });
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
            queryClient.invalidateQueries({ queryKey: ['admin-profiles', school?.id] });
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
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student',
        gradeLevel: 1
    });

    const createUserMutation = useMutation({
        mutationFn: async (userData: typeof newUser) => {
            // 1. Create Auth User
            const { data, error } = await supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        name: userData.name,
                        grade_level: userData.role === 'student' ? userData.gradeLevel : null,
                        role: userData.role, // Metadata for triggers
                        school_id: school?.id,
                        academic_year_id: 2 // defaulting to current, logical fix needed later or fetch context
                    }
                }
            });

            if (error) throw error;
            if (!data.user) throw new Error("Failed to create user");

            // 2. Insert into user_roles
            const { error: roleError } = await supabase.from('user_roles').insert({
                user_id: data.user.id,
                role: userData.role as 'student' | 'teacher' | 'admin'
            });

            if (roleError) console.error("Role assignment failed:", roleError);

            // 3. Update Profile
            const { error: profileError } = await supabase.from('profiles').update({
                school_id: school?.id,
                grade_level: userData.role === 'student' ? userData.gradeLevel : null,
                name: userData.name
            }).eq('id', data.user.id);

            if (profileError) console.error("Profile update failed:", profileError);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
            queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
            setIsCreateDialogOpen(false);
            setNewUser({ name: '', email: '', password: '', role: 'student', gradeLevel: 1 });
            toast({ title: 'User created successfully' });
        },
        onError: (error) => {
            toast({ title: 'Creation failed', description: error.message, variant: 'destructive' });
        }
    });
    return (
        <AdminLayout title="">
            <div className="flex justify-between items-center mb-4">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create User
                </Button>

                <Select value={filterGrade} onValueChange={setFilterGrade}>
                    <SelectTrigger className="w-[180px] bg-white">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="All Grades" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        {Object.entries(GRADE_LABELS)
                            .filter(([value]) => value !== '12')
                            .map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Grade</TableHead>
                                <TableHead>Roles</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></TableCell></TableRow>
                            ) : filteredProfiles.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
                            ) : filteredProfiles.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{user.email || '—'}</TableCell>
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
                                            {(user.grade_level === 11 || user.grade_level === 12) && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingUser(user);
                                                        setSelectedBooks(userAssignments || []);
                                                        setIsAssignDialogOpen(true);
                                                    }}
                                                    className="bg-accent/10 hover:bg-accent/20 text-accent font-bold"
                                                >
                                                    Assign Books
                                                </Button>
                                            )}
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

            {/* Create User Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input
                                value={newUser.name}
                                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                placeholder="john@example.com"
                                type="email"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                placeholder="••••••••"
                                type="password"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select
                                value={newUser.role}
                                onValueChange={(v) => setNewUser({ ...newUser, role: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="teacher">Teacher</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {newUser.role === 'student' && (
                            <div className="space-y-2">
                                <Label>Grade Level</Label>
                                <Select
                                    value={newUser.gradeLevel.toString()}
                                    onValueChange={(v) => setNewUser({ ...newUser, gradeLevel: parseInt(v) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(GRADE_LABELS).map(([val, label]) => (
                                            <SelectItem key={val} value={val}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => createUserMutation.mutate(newUser)}
                            disabled={createUserMutation.isPending || !newUser.name || !newUser.email || !newUser.password}
                        >
                            {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

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

            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Assign Senior High Books to {editingUser?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {allShsBooks?.map((book) => (
                                    <div key={book.id} className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                        <Checkbox
                                            id={`book-${book.id}`}
                                            checked={selectedBooks.includes(book.id)}
                                            onCheckedChange={(c) => {
                                                if (c) setSelectedBooks([...selectedBooks, book.id]);
                                                else setSelectedBooks(selectedBooks.filter(id => id !== book.id));
                                            }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <Label
                                                htmlFor={`book-${book.id}`}
                                                className="text-sm font-semibold truncate block cursor-pointer"
                                            >
                                                {book.title}
                                            </Label>
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                                Grade {book.grade_level} • {book.subject || 'No Subject'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => editingUser && assignBooksMutation.mutate({ userId: editingUser.id, bookIds: selectedBooks })}
                            disabled={assignBooksMutation.isPending}
                        >
                            {assignBooksMutation.isPending ? 'Assigning...' : 'Save Assignments'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout >
    );
}
