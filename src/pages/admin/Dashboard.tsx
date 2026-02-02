import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Calendar as CalendarIcon,
  CheckSquare,
  BookOpen,
  MoreHorizontal,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DayPicker } from 'react-day-picker';
import "react-day-picker/dist/style.css";

// Mock data for charts if real data is insufficient
const GENDER_DATA = [
  { name: 'Male', value: 86, color: '#4facfe' },
  { name: 'Female', value: 14, color: '#f093fb' },
];

const STUDENT_OVERVIEW_DATA = [
  { name: 'Grade 3', value: 35, fill: '#4facfe' },
  { name: 'Grade 8', value: 40, fill: '#00f2fe' },
  { name: 'Grade 6', value: 25, fill: '#43e97b' },
  { name: 'Grade 5', value: 25, fill: '#fa709a' },
];


export default function AdminDashboard() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Used for debugging/context if needed, though mostly visual now
  const { school } = useAuth();

  // Fetch stats from Supabase
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats', school?.id],
    queryFn: async () => {
      if (!school?.id) return { students: 0, teachers: 0, classes: 0, attendance: 0 };

      // 1. Count Students (Profiles with grade_level in this school)
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', school.id)
        .not('grade_level', 'is', null);

      // 2. Count Teachers (Profiles in this school - assuming for now we just count all profiles minus students, or we need a join)
      // Since specific teacher counting requires joining user_roles which might be complex without exact relation name, 
      // we'll temporarily estimate or just count all profiles for this school as a baseline if specific teacher logic is tricky.
      // Better approach: Join user_roles. Assuming relation exists.
      // Attempting to select profiles where school_id matches and we join user_roles. 
      // If that fails, we fallback to a simpler metric. 
      // Let's try to count profiles that DO NOT have a grade level (often Staff/Teachers)
      const { count: teacherCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', school.id)
        .is('grade_level', null);

      // 3. Classes (Mock or count unique grades)
      // We can count distinct grade levels with students
      // For now, fixed or based on school type
      const classesCount = 12;

      // 4. Attendance (Logs for this school today)
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceLogs } = await (supabase as any)
        .from('attendance_logs')
        .select('status')
        .eq('school_id', school.id)
        .gte('check_in_time', today);

      const presentCount = attendanceLogs?.filter((l: any) => l.status === 'present').length || 0;
      const totalAttendance = attendanceLogs?.length || 0;
      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

      return {
        students: studentCount || 0,
        teachers: teacherCount || 0,
        classes: classesCount || 12,
        attendance: attendanceRate || 0
      };
    },
    enabled: !!school?.id
  });

  const StatCard = ({ title, value, color, icon: Icon, subLabel }: any) => (
    <div className={`rounded-xl p-6 text-white overflow-hidden relative shadow-lg ${color}`}>
      <div className="relative z-10">
        <h3 className="text-4xl font-bold mb-1">{value}</h3>
        <p className="font-medium opacity-90">{title}</p>
        {subLabel && <p className="text-xs opacity-75 mt-2">{subLabel}</p>}
      </div>
      <Icon className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 opacity-20" />
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
    </div>
  );



  return (
    <AdminLayout title="School Management System">
      <div className="space-y-8 max-w-[1600px] mx-auto">

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Students"
            value={stats?.students}
            color="bg-gradient-to-br from-orange-400 to-orange-500"
            icon={Users}
          />
          <StatCard
            title="Teachers"
            value={stats?.teachers}
            color="bg-gradient-to-br from-emerald-400 to-emerald-600"
            icon={CheckSquare}
          />
          <StatCard
            title="Classes"
            value={stats?.classes}
            color="bg-gradient-to-br from-blue-400 to-blue-600"
            icon={BookOpen}
          />
          <StatCard
            title="Attendance"
            value={`${stats?.attendance}%`}
            subLabel="Given 80%"
            color="bg-gradient-to-br from-rose-500 to-red-600"
            icon={CheckSquare}
          />
        </div>



        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">

          {/* Left Column */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <Card className="shadow-sm border-slate-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-lg text-slate-800">Upcoming Events</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-5">
                  {[
                    { title: 'School Assembly', date: 'Apr 24', icon: Users, color: 'bg-red-100 text-red-500' },
                    { title: 'Math Exam', date: 'Apr 25', icon: BookOpen, color: 'bg-blue-100 text-blue-500' },
                    { title: 'Science Fair', date: 'Apr 30', icon: CalendarIcon, color: 'bg-orange-100 text-orange-500' },
                  ].map((event, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${event.color}`}>
                        <event.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{event.title}</p>
                        <p className="text-xs text-muted-foreground">09:00 AM - 10:00 AM</p>
                      </div>
                      <span className="text-sm font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded">{event.date}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Teacher Schedule */}
            <Card className="shadow-sm border-slate-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-lg text-slate-800">Teacher Schedule</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-5">
                  {[
                    { name: 'Mrs Davis', subject: 'English', time: '10:30 AM', img: 'https://i.pravatar.cc/150?u=1' },
                    { name: 'Mr. Smith', subject: 'Math', time: '11:00 AM', img: 'https://i.pravatar.cc/150?u=2' },
                    { name: 'Miss Lee', subject: 'Science', time: '02:00 PM', img: 'https://i.pravatar.cc/150?u=3' },
                  ].map((teacher, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <img src={teacher.img} className="w-10 h-10 rounded-full object-cover" alt={teacher.name} />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 text-sm">{teacher.name}</p>
                        <p className="text-xs text-muted-foreground">{teacher.subject}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-500">{teacher.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column */}
          <div className="space-y-6">
            {/* Recent Activities */}
            <Card className="shadow-sm border-slate-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-lg text-slate-800">Recent Activities</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-5">
                  {[
                    { text: 'Nily Parker admitted to Grade 5', icon: CheckSquare, color: 'bg-yellow-400' },
                    { text: 'John Smith assigned as Math Teacher', icon: Users, color: 'bg-blue-500' },
                    { text: 'Science Fair scheduled for April 30', icon: CalendarIcon, color: 'bg-orange-400' },
                    { text: 'Emma Brown submitted term paper', icon: BookOpen, color: 'bg-green-500' },
                  ].map((activity, i) => (
                    <div key={i} className="flex gap-3">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${activity.color}`}>
                        <activity.icon className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-sm text-slate-600 leading-snug">
                        <span className="font-medium text-slate-900">{activity.text.split(' ').slice(0, 2).join(' ')}</span> {activity.text.split(' ').slice(2).join(' ')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gender Chart */}
            <Card className="shadow-sm border-slate-100">
              <CardContent className="p-6">
                <div className="h-[200px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={GENDER_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {GENDER_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-slate-700">86%</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Male</span>
                  </div>
                </div>
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#4facfe]" />
                    <span className="text-sm text-slate-600">Male (86%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#f093fb]" />
                    <span className="text-sm text-slate-600">Female (14%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Student Overview */}
            <Card className="shadow-sm border-slate-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-slate-800">Student Overview</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="w-4 h-4" /></Button>
                </div>

                {/* Pie Chart Top */}
                <div className="flex gap-4 mb-6">
                  <div className="w-1/2 h-[140px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={STUDENT_OVERVIEW_DATA}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          dataKey="value"
                        >
                          {STUDENT_OVERVIEW_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={2} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 flex flex-col justify-center space-y-2 text-xs">
                    {STUDENT_OVERVIEW_DATA.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                        <span className="text-slate-600">{d.name}</span>
                        <span className="font-bold ml-auto">{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vertical Bar Chart */}
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={STUDENT_OVERVIEW_DATA}>
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {STUDENT_OVERVIEW_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Calendar */}
            <Card className="shadow-sm border-slate-100 bg-gradient-to-br from-blue-600 to-blue-500 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{date?.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20"><span className="sr-only">Prev</span>←</Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20"><span className="sr-only">Next</span>→</Button>
                  </div>
                </div>
                <div className="calendar-wrapper-custom">
                  <DayPicker
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    showOutsideDays
                    className="p-0 w-full"
                    classNames={{
                      month: "space-y-4",
                      caption: "hidden",
                      head_row: "flex justify-between w-full mb-2",
                      head_cell: "text-blue-100 w-8 text-[0.8rem] font-normal",
                      row: "flex justify-between w-full mt-2",
                      cell: "text-center text-sm p-0 bg-transparent relative [&:has([aria-selected])]:bg-primary rounded-md focus-within:relative focus-within:z-20",
                      day: "text-white h-8 w-8 hover:bg-white/20 rounded-full font-medium aria-selected:bg-white aria-selected:text-blue-600",
                      day_today: "bg-white/20",
                      day_outside: "text-blue-300 opacity-50",
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Bottom Actions Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Button variant="outline" className="h-14 justify-between px-6 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded-xl">
            <span className="flex items-center gap-3 font-semibold">
              <div className="bg-blue-100 p-2 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
              Manage Students
            </span>
            <ArrowRight className="w-5 h-5 text-slate-400" />
          </Button>
          <Button variant="outline" className="h-14 justify-between px-6 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded-xl">
            <span className="flex items-center gap-3 font-semibold">
              <div className="bg-orange-100 p-2 rounded-lg"><BookOpen className="w-5 h-5 text-orange-600" /></div>
              Organize Classes
            </span>
            <ArrowRight className="w-5 h-5 text-slate-400" />
          </Button>
          <Button variant="outline" className="h-14 justify-between px-6 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm rounded-xl">
            <span className="flex items-center gap-3 font-semibold">
              <div className="bg-blue-600 p-2 rounded-lg"><Plus className="w-5 h-5 text-white" /></div>
              Track Attendance
            </span>
            <ArrowRight className="w-5 h-5 text-slate-400" />
          </Button>
        </div>

      </div>
    </AdminLayout>
  );
}
