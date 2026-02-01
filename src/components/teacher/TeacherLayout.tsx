import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { BookOpen, LogOut, GraduationCap, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherLayoutProps {
  children: ReactNode;
  title?: string;
}

export function TeacherLayout({ children, title }: TeacherLayoutProps) {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-gradient">Teacher Portal</h1>
              <p className="text-xs text-muted-foreground">MABDC Library</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/teacher')}
                className={cn(
                  "gap-2",
                  location.pathname === '/teacher' && "bg-muted"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/bookshelf')}
                className="gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Student View
              </Button>
            </nav>

            <div className="text-right hidden sm:block">
              <p className="font-medium">{profile?.name}</p>
              <p className="text-xs text-muted-foreground">Teacher</p>
            </div>

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
              >
                Admin Panel
              </Button>
            )}

            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {title && (
          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-gradient">{title}</h2>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
