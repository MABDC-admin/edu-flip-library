import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Trash2, BookOpen, Users, X, GraduationCap, Building2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { GRADE_LABELS } from '@/types/database';
import { Checkbox } from '@/components/ui/checkbox';

export default function AdminClasses() {
    const { school, academicYear } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // State
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false);
    const [isAddClassOpen, setIsAddClassOpen] = useState(false);
    const [isManageSubjectsOpen, setIsManageSubjectsOpen] = useState(false);
    const [isEnrollStudentOpen, setIsEnrollStudentOpen] = useState(false);
    const [selectedStudentsToEnroll, setSelectedStudentsToEnroll] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('classes');

    // Forms
    const [newSection, setNewSection] = useState({ name: '', gradeLevel: 1, adviserId: 'none' });
    const [newClass, setNewClass] = useState({ subjectId: '', teacherId: '', schedule: '', room: '' });
    const [newSubject, setNewSubject] = useState({ name: '', code: '', gradeLevel: 1 });

    // --- Queries ---

    // 1. Sections
    const { data: sections, isLoading: sectionsLoading } = useQuery({
        queryKey: ['admin-sections', school?.id, academicYear?.id],
        queryFn: async () => {
            if (!school?.id || !academicYear?.id) return [];
            const { data, error } = await supabase
                .from('sections')
                .select('*, adviser:profiles(name)')
                .eq('school_id', school.id)
                .eq('academic_year_id', academicYear.id)
                .order('grade_level')
                .order('name');
            if (error) throw error;
            return data;
        },
        enabled: !!school?.id && !!academicYear?.id
    });

    // 2. Classes (for selected section)
    const { data: classes, isLoading: classesLoading } = useQuery({
        queryKey: ['admin-classes', selectedSectionId],
        queryFn: async () => {
            if (!selectedSectionId) return [];
            const { data, error } = await supabase
                .from('classes')
                .select('*, subject:subjects(name, code), teacher:profiles(name)')
                .eq('section_id', selectedSectionId);
            if (error) throw error;
            return data;
        },
        enabled: !!selectedSectionId && activeTab === 'classes'
    });

    // 3. Enrolled Students (for selected section)
    const { data: enrolledStudents, isLoading: enrolledStudentsLoading } = useQuery({
        queryKey: ['admin-section-students', selectedSectionId],
        queryFn: async () => {
            if (!selectedSectionId) return [];
            const { data, error } = await supabase
                .from('student_sections')
                .select('*, student:profiles(*)')
                .eq('section_id', selectedSectionId);
            if (error) throw error;
            return data?.map((d: any) => d.student);
        },
        enabled: !!selectedSectionId && activeTab === 'students'
    });

    // 3. Subjects (Global for school)
    const { data: subjects } = useQuery({
        queryKey: ['admin-subjects', school?.id],
        queryFn: async () => {
            if (!school?.id) return [];
            const { data, error } = await supabase
                .from('subjects')
                .select('*')
                .eq('school_id', school.id)
                .order('grade_level')
                .order('name');
            if (error) throw error;
            return data;
        },
        enabled: !!school?.id
    });

    // 4. Teachers
    const { data: teachers } = useQuery({
        queryKey: ['admin-teachers-list', school?.id],
        queryFn: async () => {
            if (!school?.id) return [];
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('user_id')
                .eq('school_id', school.id)
                .eq('role', 'teacher');

            const teacherIds = roleData?.map(r => r.user_id) || [];
            if (teacherIds.length === 0) return [];

            const { data } = await supabase.from('profiles').select('id, name').in('id', teacherIds).order('name');
            return data || [];
        },
        enabled: !!school?.id
    });

    // 5. Unenrolled Students (Potential enrollees)
    const { data: unenrolledStudents } = useQuery({
        queryKey: ['admin-unenrolled-students', school?.id, academicYear?.id, sections?.find((s: any) => s.id === selectedSectionId)?.grade_level],
        queryFn: async () => {
            if (!school?.id || !academicYear?.id) return [];
            const gradeLevel = sections?.find((s: any) => s.id === selectedSectionId)?.grade_level;

            // Get all students of this grade level
            // TODO: filter out those already in a section for this AY
            // We can do a "not in" query manually

            // 1. Get already enrolled IDs for this AY
            const { data: enrollments } = await supabase
                .from('student_sections')
                .select('student_id')
                .eq('academic_year_id', academicYear.id);
            const enrolledIds = enrollments?.map((e: { student_id: string }) => e.student_id) || [];

            // 2. Get students of grade
            const query = supabase
                .from('profiles')
                .select('*')
                .eq('school_id', school.id)
                .eq('grade_level', gradeLevel ?? 1)
                .order('name');

            // To properly filter by role, we should ideally join user_roles, but usually profile grade_level implies student

            const { data: students } = await query;
            if (!students) return [];

            return students.filter((s: any) => !enrolledIds.includes(s.id));
        },
        enabled: isEnrollStudentOpen && !!selectedSectionId
    });

    // --- Mutations ---

    // Create Section
    const createSectionMutation = useMutation({
        mutationFn: async (data: typeof newSection) => {
            if (!school?.id || !academicYear?.id) throw new Error("School or academic year not selected");
            const { error } = await supabase.from('sections').insert({
                school_id: school.id,
                academic_year_id: academicYear.id,
                name: data.name,
                grade_level: data.gradeLevel,
                adviser_id: data.adviserId === 'none' ? null : data.adviserId
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
            setIsCreateSectionOpen(false);
            setNewSection({ name: '', gradeLevel: 1, adviserId: 'none' });
            toast({ title: 'Section created' });
        },
        onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
    });

    // Create Class
    const createClassMutation = useMutation({
        mutationFn: async (data: typeof newClass) => {
            if (!selectedSectionId) throw new Error("No section selected");
            if (!school?.id || !academicYear?.id) throw new Error("School or academic year not selected");
            const { error } = await supabase.from('classes').insert({
                school_id: school.id,
                academic_year_id: academicYear.id,
                section_id: selectedSectionId,
                subject_id: data.subjectId,
                teacher_id: data.teacherId === 'none' ? null : data.teacherId,
                schedule: data.schedule,
                room: data.room
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
            setIsAddClassOpen(false);
            setNewClass({ subjectId: '', teacherId: '', schedule: '', room: '' });
            toast({ title: 'Class added' });
        },
        onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
    });

    // Enroll Students
    const enrollStudentsMutation = useMutation({
        mutationFn: async (studentIds: string[]) => {
            if (!selectedSectionId) throw new Error("No section selected");
            if (!school?.id || !academicYear?.id) throw new Error("School or academic year not selected");
            const { error } = await supabase.from('student_sections').insert(
                studentIds.map(sid => ({
                    school_id: school.id,
                    academic_year_id: academicYear.id,
                    section_id: selectedSectionId,
                    student_id: sid
                }))
            );
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-section-students'] });
            queryClient.invalidateQueries({ queryKey: ['admin-unenrolled-students'] });
            setIsEnrollStudentOpen(false);
            setSelectedStudentsToEnroll([]);
            toast({ title: 'Students enrolled' });
        },
        onError: (err) => toast({ title: 'Enrollment failed', description: err.message, variant: 'destructive' })
    });

    // Remove Student
    const removeStudentMutation = useMutation({
        mutationFn: async (studentId: string) => {
            if (!selectedSectionId) throw new Error("No section");
            const { error } = await supabase.from('student_sections').delete()
                .eq('section_id', selectedSectionId)
                .eq('student_id', studentId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-section-students'] });
            toast({ title: 'Student removed from section' });
        },
        onError: (err) => toast({ title: 'Removal failed', description: err.message, variant: 'destructive' })
    });


    // Create Subject
    const createSubjectMutation = useMutation({
        mutationFn: async (data: typeof newSubject) => {
            if (!school?.id) throw new Error("School not selected");
            const { error } = await supabase.from('subjects').insert({
                school_id: school.id,
                name: data.name,
                code: data.code,
                grade_level: data.gradeLevel
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
            setNewSubject({ name: '', code: '', gradeLevel: 1 });
            toast({ title: 'Subject created' });
        },
        onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
    });

    // Delete Helpers
    const deleteSection = async (id: string) => {
        if (!confirm("Delete this section? All classes and enrollments in it will be lost.")) return;
        const { error } = await supabase.from('sections').delete().eq('id', id);
        if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
        else {
            if (selectedSectionId === id) setSelectedSectionId(null);
            queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
            toast({ title: 'Section deleted' });
        }
    };

    const deleteClass = async (id: string) => {
        if (!confirm("Delete this class? Grades associated with it might be lost.")) return;
        const { error } = await supabase.from('classes').delete().eq('id', id);
        if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
        else {
            queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
            toast({ title: 'Class deleted' });
        }
    };

    return (
        <AdminLayout title="">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Classes & Sections</h2>
                    <p className="text-muted-foreground">Manage sections, subjects, and enrollments for AY {academicYear?.label || '...'}.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsManageSubjectsOpen(true)}>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Manage Subjects
                    </Button>
                    <Button onClick={() => setIsCreateSectionOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Section
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
                {/* Sections Sidebar */}
                <Card className="md:col-span-1 h-full flex flex-col">
                    <CardHeader className="pb-3 px-4 pt-4">
                        <CardTitle className="text-lg">Sections</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto px-2 pb-2">
                        {sectionsLoading ? (
                            <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-muted-foreground" /></div>
                        ) : sections?.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-8">No sections found.</div>
                        ) : (
                            <div className="space-y-1">
                                {sections?.map((section: any) => (
                                    <div
                                        key={section.id}
                                        className={`p-3 rounded-lg cursor-pointer transition-colors flex justify-between items-start group ${selectedSectionId === section.id ? 'bg-primary/10 border-primary/20' : 'hover:bg-accent'}`}
                                        onClick={() => setSelectedSectionId(section.id)}
                                    >
                                        <div>
                                            <div className="font-semibold text-sm">{section.name}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Grade {section.grade_level} • {section.adviser?.name || 'No Adviser'}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-1 text-destructive hover:bg-destructive/10"
                                            onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Main Content */}
                <Card className="md:col-span-3 h-full flex flex-col bg-slate-50/50">
                    {selectedSectionId ? (
                        <>
                            <div className="p-4 border-b bg-white rounded-t-xl flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg">{sections?.find((s: any) => s.id === selectedSectionId)?.name}</h3>
                                    <p className="text-xs text-muted-foreground">Grade {sections?.find((s: any) => s.id === selectedSectionId)?.grade_level}</p>
                                </div>
                                <div className="flex gap-2">
                                    {activeTab === 'classes' && (
                                        <Button size="sm" onClick={() => setIsAddClassOpen(true)}>
                                            <Plus className="w-4 h-4 mr-2" /> Add Class
                                        </Button>
                                    )}
                                    {activeTab === 'students' && (
                                        <Button size="sm" onClick={() => setIsEnrollStudentOpen(true)}>
                                            <Users className="w-4 h-4 mr-2" /> Enroll Students
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                                <div className="px-4 pt-2 bg-white border-b">
                                    <TabsList>
                                        <TabsTrigger value="classes">Classes & Subjects</TabsTrigger>
                                        <TabsTrigger value="students">Enrolled Students</TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="classes" className="flex-1 overflow-y-auto p-0 m-0">
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="pl-6">Subject</TableHead>
                                                    <TableHead>Teacher</TableHead>
                                                    <TableHead>Schedule</TableHead>
                                                    <TableHead>Room</TableHead>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {classesLoading ? (
                                                    <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                                                ) : classes?.length === 0 ? (
                                                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No classes added to this section yet.</TableCell></TableRow>
                                                ) : (
                                                    classes?.map((cls: any) => (
                                                        <TableRow key={cls.id}>
                                                            <TableCell className="font-medium pl-6">
                                                                <div>{cls.subject?.name}</div>
                                                                <div className="text-xs text-muted-foreground">{cls.subject?.code}</div>
                                                            </TableCell>
                                                            <TableCell>{cls.teacher?.name || <span className="text-muted-foreground italic">Unassigned</span>}</TableCell>
                                                            <TableCell>{cls.schedule || '—'}</TableCell>
                                                            <TableCell>{cls.room || '—'}</TableCell>
                                                            <TableCell>
                                                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => deleteClass(cls.id)}>
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </TabsContent>

                                <TabsContent value="students" className="flex-1 overflow-y-auto p-0 m-0">
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="pl-6">Student Name</TableHead>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {enrolledStudentsLoading ? (
                                                    <TableRow><TableCell colSpan={3} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                                                ) : enrolledStudents?.length === 0 ? (
                                                    <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground">No students enrolled in this section.</TableCell></TableRow>
                                                ) : (
                                                    enrolledStudents?.map((student: any) => (
                                                        <TableRow key={student.id}>
                                                            <TableCell className="font-medium pl-6 flex items-center gap-2">
                                                                <div className="bg-primary/10 rounded-full p-1"><GraduationCap className="h-4 w-4 text-primary" /></div>
                                                                {student.name}
                                                            </TableCell>
                                                            <TableCell>{student.email}</TableCell>
                                                            <TableCell>
                                                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                                                                    if (confirm('Remove student from section?')) removeStudentMutation.mutate(student.id);
                                                                }}>
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </TabsContent>
                            </Tabs>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Building2 className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select a section to view its details</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Dialogs */}

            {/* Create Section */}
            <Dialog open={isCreateSectionOpen} onOpenChange={setIsCreateSectionOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>New Section</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Section Name</Label>
                            <Input placeholder="e.g. Rizal, A, Blue" value={newSection.name} onChange={(e) => setNewSection({ ...newSection, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Grade Level</Label>
                            <Select value={newSection.gradeLevel.toString()} onValueChange={(v) => setNewSection({ ...newSection, gradeLevel: parseInt(v) })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(GRADE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Adviser</Label>
                            <Select value={newSection.adviserId} onValueChange={(v) => setNewSection({ ...newSection, adviserId: v })}>
                                <SelectTrigger><SelectValue placeholder="Select teacher..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {teachers?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button onClick={() => createSectionMutation.mutate(newSection)} disabled={createSectionMutation.isPending || !newSection.name}>Create</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add Class */}
            <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add Class</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Subject</Label>
                            <Select value={newClass.subjectId} onValueChange={(v) => setNewClass({ ...newClass, subjectId: v })}>
                                <SelectTrigger><SelectValue placeholder="Select subject..." /></SelectTrigger>
                                <SelectContent>
                                    {subjects?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code || 'No Code'})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Teacher</Label>
                            <Select value={newClass.teacherId} onValueChange={(v) => setNewClass({ ...newClass, teacherId: v })}>
                                <SelectTrigger><SelectValue placeholder="Select teacher..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Unassigned</SelectItem>
                                    {teachers?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Schedule</Label>
                                <Input placeholder="e.g. MWF 9-10" value={newClass.schedule} onChange={(e) => setNewClass({ ...newClass, schedule: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Room</Label>
                                <Input placeholder="e.g. 101" value={newClass.room} onChange={(e) => setNewClass({ ...newClass, room: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button onClick={() => createClassMutation.mutate(newClass)} disabled={createClassMutation.isPending || !newClass.subjectId}>Add Class</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Enroll Students */}
            <Dialog open={isEnrollStudentOpen} onOpenChange={setIsEnrollStudentOpen}>
                <DialogContent className="max-w-md h-[80vh] flex flex-col">
                    <DialogHeader><DialogTitle>Enroll Students</DialogTitle></DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-2">
                        <p className="text-sm text-muted-foreground mb-4">Select students to enroll in this section.</p>
                        {unenrolledStudents && unenrolledStudents.length > 0 ? (
                            <div className="space-y-2">
                                {unenrolledStudents.map((s: any) => (
                                    <div key={s.id} className="flex items-center space-x-2 p-2 rounded hover:bg-slate-100">
                                        <Checkbox
                                            id={`enroll-${s.id}`}
                                            checked={selectedStudentsToEnroll.includes(s.id)}
                                            onCheckedChange={(c) => {
                                                if (c) setSelectedStudentsToEnroll([...selectedStudentsToEnroll, s.id]);
                                                else setSelectedStudentsToEnroll(selectedStudentsToEnroll.filter(id => id !== s.id));
                                            }}
                                        />
                                        <Label htmlFor={`enroll-${s.id}`} className="flex-1 cursor-pointer">
                                            {s.name} <span className="text-muted-foreground text-xs ml-2">({s.email})</span>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center py-4 text-muted-foreground">No unenrolled students found for this grade level.</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsEnrollStudentOpen(false)}>Cancel</Button>
                        <Button onClick={() => enrollStudentsMutation.mutate(selectedStudentsToEnroll)} disabled={enrollStudentsMutation.isPending || selectedStudentsToEnroll.length === 0}>
                            Enroll {selectedStudentsToEnroll.length > 0 ? `(${selectedStudentsToEnroll.length})` : ''}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Manage Subjects */}
            <Dialog open={isManageSubjectsOpen} onOpenChange={setIsManageSubjectsOpen}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader><DialogTitle>Manage Subjects</DialogTitle></DialogHeader>
                    <div className="flex-1 overflow-hidden flex flex-col gap-4">
                        <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
                            <h4 className="font-medium text-sm">Add New Subject</h4>
                            <div className="grid grid-cols-3 gap-2">
                                <Input placeholder="Subject Name" value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} />
                                <Input placeholder="Code" value={newSubject.code} onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })} />
                                <div className="flex gap-2">
                                    <Select value={newSubject.gradeLevel.toString()} onValueChange={(v) => setNewSubject({ ...newSubject, gradeLevel: parseInt(v) })}>
                                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(GRADE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={() => createSubjectMutation.mutate(newSubject)} disabled={createSubjectMutation.isPending || !newSubject.name} size="sm">Add</Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Grade</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subjects?.map((s: any) => (
                                        <TableRow key={s.id}>
                                            <TableCell>{s.name}</TableCell>
                                            <TableCell>{s.code}</TableCell>
                                            <TableCell>{s.grade_level}</TableCell>
                                            <TableCell>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={async () => {
                                                    if (confirm('Delete subject?')) {
                                                        await supabase.from('subjects').delete().eq('id', s.id);
                                                        queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
                                                    }
                                                }}><Trash2 className="w-3 h-3" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </AdminLayout>
    );
}
