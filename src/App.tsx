import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Bookshelf from "./pages/Bookshelf";
import FlipbookReader from "./pages/FlipbookReader";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminBooks from "./pages/admin/Books";
// Fix Users.tsx role casting
import AdminStudents from "./pages/admin/Students";
import AdminUsers from "./pages/admin/Users";
import AdminQuipper from "./pages/admin/Quipper";
import AdminEnrollment from "./pages/admin/Enrollment";
import AdminAttendance from "./pages/admin/Attendance";
import AdminTeachers from "./pages/admin/Teachers";
import AdminClasses from "./pages/admin/Classes";
import AdminGrades from "./pages/admin/Grades";
import AdminSchools from "./pages/admin/Schools";
import AdminAcademicYears from "./pages/admin/AcademicYears";
import AdminSettings from "./pages/admin/Settings";
import AttendanceScanner from "./pages/AttendanceScanner";
import TeacherDashboard from "./pages/teacher/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Bookshelf />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/bookshelf" element={<Bookshelf />} />
            <Route path="/read/:bookId" element={<FlipbookReader />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/books" element={<AdminBooks />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/quipper" element={<AdminQuipper />} />
            <Route path="/admin/enrollment" element={<AdminEnrollment />} />
            <Route path="/admin/attendance" element={<AdminAttendance />} />
            <Route path="/admin/teachers" element={<AdminTeachers />} />
            <Route path="/admin/classes" element={<AdminClasses />} />
            <Route path="/admin/grades" element={<AdminGrades />} />
            <Route path="/admin/attendance/scanner" element={<AttendanceScanner />} />
            <Route path="/admin/schools" element={<AdminSchools />} />
            <Route path="/admin/academic-years" element={<AdminAcademicYears />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
