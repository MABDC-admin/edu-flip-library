import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Users,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Library,
  GraduationCap,
  Clock,
  Building2,
  Calendar,
  UserCog,
  School,
  Award,
  Settings,
  ChevronDown,
  UserPlus,
  CheckSquare,
  Zap
} from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { School as SchoolType, AcademicYear } from '@/types/database';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/books', label: 'Manage Books', icon: BookOpen },
  { href: '/admin/quipper', label: 'Quipper Modules', icon: Library },
  { href: '/admin/enrollment', label: 'Enrollment', icon: GraduationCap },
  { href: '/admin/attendance', label: 'Attendance', icon: Clock },
  { href: '/admin/teachers', label: 'Teachers', icon: UserCog },
  { href: '/admin/classes', label: 'Classes', icon: School },
  { href: '/admin/grades', label: 'Grades', icon: Award },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const quickLaunchItems = [
  { href: '/admin/enrollment', label: 'Admit Student', icon: UserPlus, color: 'text-orange-400' },
  { href: '/admin/teachers', label: 'Add Teacher', icon: Users, color: 'text-emerald-400' },
  { href: '/admin/academic-years', label: 'Schedule', icon: Calendar, color: 'text-blue-400' },
  { href: '/admin/classes', label: 'Classes', icon: BookOpen, color: 'text-purple-400' },
  { href: '/admin/attendance', label: 'Attendance', icon: CheckSquare, color: 'text-red-400' },
  { href: '/admin/grades', label: 'Enter Grades', icon: CheckSquare, color: 'text-indigo-400' },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, profile, school, academicYear, setSchool, setAcademicYear, signOut, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch all schools for switching (only for admins)
  const { data: schools } = useQuery({
    queryKey: ['schools'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('schools').select('*').order('name');
      return data as unknown as SchoolType[];
    },
    enabled: isAdmin,
  });

  // Fetch all academic years
  const { data: academicYears } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('academic_years').select('*').order('start_date', { ascending: false });
      return data as unknown as AcademicYear[];
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 border-r z-50 transform transition-transform duration-300",
        "lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        "bg-gradient-to-b from-blue-900 to-blue-950 text-white"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-blue-800">
            <Link to="/admin" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center border shadow-sm bg-white">
                {school?.logo_url ? (
                  <img src={school.logo_url} alt={school.name} className="w-full h-full object-cover" />
                ) : (
                  <img src="/logo.jpg" alt="Default Logo" className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <h1 className="font-display font-bold text-xl text-white">{school?.short_name || 'MABDC'}</h1>
                <p className="text-[10px] text-blue-200 leading-none">Library Admin</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <HoverCard openDelay={0} closeDelay={100}>
              <HoverCardTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group",
                    "bg-gradient-to-r from-blue-600/20 to-blue-600/10 text-blue-100 hover:text-white hover:from-blue-600 hover:to-blue-500 border border-blue-500/20 hover:border-blue-400 shadow-sm mb-6"
                  )}
                >
                  <div className="p-1 bg-blue-500 rounded-md shadow-inner group-hover:bg-white/20 transition-colors">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-sm tracking-tight flex-1 text-left">Quick Actions</span>
                </button>
              </HoverCardTrigger>
              <HoverCardContent side="right" align="start" className="w-[320px] p-4 bg-slate-900 border-blue-800 shadow-xl ml-2">
                <div className="grid grid-cols-2 gap-3">
                  {quickLaunchItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className="flex flex-col gap-1 p-3 rounded-lg bg-blue-950 hover:bg-blue-800 transition-colors border border-blue-800/50 hover:border-blue-600 group"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-md bg-blue-900/50 group-hover:bg-blue-900/80 transition-colors", item.color.replace('text-', 'bg-').replace('-400', '-500/20'))}>
                          <item.icon className={cn("w-4 h-4", item.color)} />
                        </div>
                        <span className="text-xs font-semibold text-blue-100">{item.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </HoverCardContent>
            </HoverCard>

            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors group",
                    isActive
                      ? "bg-blue-600 text-white shadow-md relative overflow-hidden after:absolute after:left-0 after:top-0 after:h-full after:w-1 after:bg-blue-300"
                      : "text-blue-100 hover:bg-blue-800/50 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-blue-800">
            <p className="text-[10px] text-blue-400 text-center italic opacity-50">v2.1.0-admin</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen bg-slate-50/50">
        <header className="border-b border-blue-800 bg-gradient-to-r from-blue-900 to-blue-800 h-16 flex items-center justify-between px-6 lg:px-8 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Title Removed as per request */}
            <div />

            {/* Switchers */}
            <div className="hidden md:flex items-center gap-2 border-l border-blue-700 pl-4 h-8 ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 hover:bg-blue-800 text-blue-100 hover:text-white">
                    <Building2 className="w-4 h-4 text-blue-300" />
                    <span className="text-sm font-medium">{school?.name || 'Select School'}</span>
                    <ChevronDown className="w-3 h-3 text-blue-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px]">
                  <DropdownMenuLabel>Switch School</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {schools?.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={() => setSchool(s)}
                      className={school?.id === s.id ? "bg-primary/5 text-primary font-medium" : ""}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded border bg-white flex items-center justify-center overflow-hidden">
                          <img src={s.logo_url || "/logo.jpg"} alt="" className="w-full h-full object-cover" />
                        </div>
                        {s.name}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-2 px-2 hover:bg-blue-800 text-blue-100 hover:text-white">
                    <Calendar className="w-4 h-4 text-blue-300" />
                    <span className="text-sm font-medium">{academicYear?.label || 'Select Year'}</span>
                    <ChevronDown className="w-3 h-3 text-blue-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[160px]">
                  <DropdownMenuLabel>Academic Year</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {academicYears?.map((ay) => (
                    <DropdownMenuItem
                      key={ay.id}
                      onClick={() => setAcademicYear(ay)}
                      className={academicYear?.id === ay.id ? "bg-primary/5 text-primary font-medium" : ""}
                    >
                      {ay.label}
                      {ay.is_active && <span className="ml-auto text-[10px] bg-success/10 text-success px-1.5 rounded-full font-bold">Active</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 flex items-center gap-3 px-2 hover:bg-blue-800 rounded-full transition-all">
                  <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-xs font-bold text-white leading-tight">{profile?.name || 'Admin User'}</span>
                    <span className="text-[10px] text-blue-300 leading-tight">Administrator</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-600 border-2 border-blue-500/50 flex items-center justify-center shadow-lg group-hover:border-white transition-colors">
                    <span className="text-xs font-bold text-white">
                      {profile?.name?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-1">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none">{profile?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">administrator@mabdc.edu</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/bookshelf')} className="cursor-pointer gap-2">
                  <Library className="w-4 h-4 text-primary" />
                  <span>Back to Bookshelf</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive gap-2 font-medium">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
