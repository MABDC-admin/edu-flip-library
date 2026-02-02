import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Calendar, Shield, ChevronRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation } from '@tanstack/react-query';

export default function AdminSettings() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [passwords, setPasswords] = useState({
        new: '',
        confirm: ''
    });

    const updatePasswordMutation = useMutation({
        mutationFn: async (password: string) => {
            const { error } = await supabase.auth.updateUser({
                password: password
            });
            if (error) throw error;
        },
        onSuccess: () => {
            setIsPasswordDialogOpen(false);
            setPasswords({ new: '', confirm: '' });
            toast({ title: 'Password updated successfully' });
        },
        onError: (error) => {
            toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
        }
    });

    const settingsItems = [
        {
            title: 'Manage Schools',
            description: 'Configure school profiles, logos, and identifiers.',
            icon: Building2,
            href: '/admin/schools',
            color: 'text-blue-500',
            bgColor: 'bg-blue-50'
        },
        {
            title: 'Academic Years',
            description: 'Set up academic terms, start/end dates, and active years.',
            icon: Calendar,
            href: '/admin/academic-years',
            color: 'text-purple-500',
            bgColor: 'bg-purple-50'
        },
        {
            title: 'Manage Roles',
            description: 'Control user permissions and administrative access.',
            icon: Shield,
            href: '/admin/users',
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-50'
        },
        {
            title: 'Security',
            description: 'Update your password and account security settings.',
            icon: Lock,
            action: () => setIsPasswordDialogOpen(true),
            color: 'text-orange-500',
            bgColor: 'bg-orange-50'
        }
    ];

    return (
        <AdminLayout title="Settings">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {settingsItems.map((item) => (
                        <Card
                            key={item.title}
                            className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-slate-200"
                            onClick={() => item.href ? navigate(item.href) : item.action?.()}
                        >
                            <CardHeader className="pb-4">
                                <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    <item.icon className={`w-6 h-6 ${item.color}`} />
                                </div>
                                <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                                    {item.title}
                                </CardTitle>
                                <CardDescription className="line-clamp-2">
                                    {item.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-between group-hover:bg-slate-50"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        item.href ? navigate(item.href) : item.action?.();
                                    }}
                                >
                                    <span className="text-sm font-medium">
                                        {item.href ? 'Open Settings' : 'Manage Security'}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                            Enter a new password for your account. This will update your login credentials immediately.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input
                                type="password"
                                value={passwords.new}
                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                placeholder="Min. 6 characters"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirm Password</Label>
                            <Input
                                type="password"
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                placeholder="Re-enter password"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => updatePasswordMutation.mutate(passwords.new)}
                            disabled={
                                updatePasswordMutation.isPending ||
                                !passwords.new ||
                                passwords.new.length < 6 ||
                                passwords.new !== passwords.confirm
                            }
                        >
                            {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
