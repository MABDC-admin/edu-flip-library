import { useNavigate } from 'react-router-dom';
import { LogOut, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GRADE_LABELS, Profile } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

interface BookshelfHeaderProps {
    profile: Profile | null;
    isAdmin: boolean;
    isTeacher: boolean;
    onSignOut: () => void;
}

export function BookshelfHeader({ profile, isAdmin, isTeacher, onSignOut }: BookshelfHeaderProps) {
    const navigate = useNavigate();
    const { school } = useAuth();

    return (
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b min-h-[60px]">
            <div className="container mx-auto px-4 py-2 flex items-center justify-between h-full">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center border shadow-sm cursor-pointer bg-white" onClick={() => navigate('/')}>
                            <img src={school?.logo_url || "/logo.jpg"} alt="School Logo" className="w-full h-full object-cover" />
                        </div>
                        <div className="cursor-pointer" onClick={() => navigate('/')}>
                            <h1 className="font-display font-bold text-xl text-gradient">{school?.short_name || 'MABDC'}</h1>
                            <p className="text-xs text-muted-foreground">Library</p>
                        </div>
                    </div>

                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="font-medium text-sm leading-tight">{profile?.name}</p>
                        <p className="text-[11px] text-muted-foreground font-bold tracking-tight">
                            {profile?.grade_level ? GRADE_LABELS[profile.grade_level] : (isAdmin ? 'Administrator' : 'Student')}
                        </p>
                    </div>

                    {isTeacher && !isAdmin && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate('/teacher')}
                            className="gradient-primary hidden sm:flex h-9"
                        >
                            <BookOpen className="w-4 h-4 mr-2" />
                            Teacher Dashboard
                        </Button>
                    )}

                    {isAdmin && (
                        <div className="hidden sm:flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/admin')}
                                className="h-9 font-medium"
                            >
                                Admin Dashboard
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => navigate('/admin/books')}
                                className="gradient-primary h-9 font-medium"
                            >
                                <BookOpen className="w-4 h-4 mr-2" />
                                Manage Library
                            </Button>
                        </div>
                    )}

                    <Button variant="ghost" size="icon" onClick={onSignOut} className="h-9 w-9 rounded-full hover:bg-slate-100 transition-colors">
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
