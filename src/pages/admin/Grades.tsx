import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Calculator, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

// DepEd Transmutation Table (Simplified for K-12)
// Source: DepEd Order No. 8, s. 2015
const TRANSMUTATION_TABLE = [
    { min: 100, val: 100 },
    { min: 98.40, val: 99 },
    { min: 96.80, val: 98 },
    { min: 95.20, val: 97 },
    { min: 93.60, val: 96 },
    { min: 92.00, val: 95 },
    { min: 90.40, val: 94 },
    { min: 88.80, val: 93 },
    { min: 87.20, val: 92 },
    { min: 85.60, val: 91 },
    { min: 84.00, val: 90 },
    { min: 82.40, val: 89 },
    { min: 80.80, val: 88 },
    { min: 79.20, val: 87 },
    { min: 77.60, val: 86 },
    { min: 76.00, val: 85 },
    { min: 74.40, val: 84 },
    { min: 72.80, val: 83 },
    { min: 71.20, val: 82 },
    { min: 69.60, val: 81 },
    { min: 68.00, val: 80 },
    { min: 66.40, val: 79 },
    { min: 64.80, val: 78 },
    { min: 63.20, val: 77 },
    { min: 61.60, val: 76 },
    { min: 60.00, val: 75 },
    { min: 0, val: 60 } // Keeping it safe, usually failing is explicit
];

const getTransmutedGrade = (initialGrade: number) => {
    // Round to 2 decimals first? DepEd uses specific rounding.
    // We assume input is already near standard.
    if (initialGrade > 100) return 100;
    for (const entry of TRANSMUTATION_TABLE) {
        if (initialGrade >= entry.min) return entry.val;
    }
    return 60; // Failure floor
};

export default function AdminGrades() {
    const { school, academicYear } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Selection State
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [selectedQuarter, setSelectedQuarter] = useState<string>("1");

    // Grading Config
    const [weights, setWeights] = useState({ ww: 30, pt: 50, qa: 20 });

    // Grades Data: Map of studentId -> Grade Object
    const [gradesBuffer, setGradesBuffer] = useState<Record<string, any>>({});
    const [hasChanges, setHasChanges] = useState(false);

    // --- Queries ---
    const { data: sections } = useQuery({
        queryKey: ['admin-sections-list', school?.id, academicYear?.id],
        queryFn: async () => {
            if (!school?.id || !academicYear?.id) return [];
            const { data } = await supabase.from('sections')
                .select('*')
                .eq('school_id', school.id)
                .eq('academic_year_id', academicYear.id)
                .order('name');
            return data;
        },
        enabled: !!school?.id
    });

    const { data: classes } = useQuery({
        queryKey: ['admin-classes-list', selectedSectionId],
        queryFn: async () => {
            if (!selectedSectionId) return [];
            const { data } = await supabase.from('classes')
                .select('*, subject:subjects(name)')
                .eq('section_id', selectedSectionId);
            return data;
        },
        enabled: !!selectedSectionId
    });

    // Fetch Students AND Existing Grades
    const { data: gradeSheet, isLoading: gradeSheetLoading, isFetching: isFetchingGrades } = useQuery({
        queryKey: ['admin-gradesheet', selectedClassId, selectedQuarter],
        queryFn: async () => {
            if (!selectedClassId) return null;

            // 1. Get Class info (to know Section)
            const { data: cls } = await supabase.from('classes').select('section_id').eq('id', selectedClassId).single();
            if (!cls) throw new Error("Class not found");

            // 2. Get Students in Section
            const { data: students } = await supabase.from('student_sections')
                .select('student:profiles(id, name)')
                .eq('section_id', cls.section_id)
                .order('student(name)'); // Ordering might need join-level sorting, simplified here

            // 3. Get Existing Grades for this Class + Quarter
            const { data: existingGrades } = await supabase.from('grades')
                .select('*')
                .eq('class_id', selectedClassId)
                .eq('quarter', parseInt(selectedQuarter));

            // Merge
            const rows = (students || []).map((s: any) => {
                const existing = existingGrades?.find(g => g.student_id === s.student.id);
                return {
                    student: s.student,
                    grade: existing || {
                        written_works_score: 0, written_works_total: 100,
                        performance_tasks_score: 0, performance_tasks_total: 100,
                        quarterly_assessment_score: 0, quarterly_assessment_total: 100,
                        initial_grade: 0, transmuted_grade: 0
                    } // Default structure
                };
            });

            // Check fetching sorted
            rows.sort((a, b) => a.student.name.localeCompare(b.student.name));

            return rows;
        },
        enabled: !!selectedClassId
    });

    // Populate Buffer on load
    useEffect(() => {
        if (gradeSheet) {
            const buffer: Record<string, any> = {};
            gradeSheet.forEach(row => {
                buffer[row.student.id] = { ...row.grade };
            });
            setGradesBuffer(buffer);
            setHasChanges(false);
        }
    }, [gradeSheet]);

    // --- Calculations ---
    const calculateRow = (studentId: string, type: 'ww' | 'pt' | 'qa', field: 'score' | 'total', value: number) => {
        setGradesBuffer(prev => {
            const row = { ...prev[studentId] };

            // Update the specific field
            if (type === 'ww') {
                if (field === 'score') row.written_works_score = value;
                else row.written_works_total = value;
            } else if (type === 'pt') {
                if (field === 'score') row.performance_tasks_score = value;
                else row.performance_tasks_total = value;
            } else if (type === 'qa') {
                if (field === 'score') row.quarterly_assessment_score = value;
                else row.quarterly_assessment_total = value;
            }

            // Calculate Initial Grade
            const wwPct = row.written_works_total > 0 ? (row.written_works_score / row.written_works_total) * 100 : 0;
            const ptPct = row.performance_tasks_total > 0 ? (row.performance_tasks_score / row.performance_tasks_total) * 100 : 0;
            const qaPct = row.quarterly_assessment_total > 0 ? (row.quarterly_assessment_score / row.quarterly_assessment_total) * 100 : 0;

            const initial = (wwPct * (weights.ww / 100)) + (ptPct * (weights.pt / 100)) + (qaPct * (weights.qa / 100));
            row.initial_grade = parseFloat(initial.toFixed(2));
            row.transmuted_grade = getTransmutedGrade(row.initial_grade);

            return { ...prev, [studentId]: row };
        });
        setHasChanges(true);
    };

    // Save
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!selectedClassId || !gradeSheet) return;

            const upserts = Object.keys(gradesBuffer).map(studentId => {
                const g = gradesBuffer[studentId];
                return {
                    id: g.id, // Include if updating existing
                    school_id: school?.id,
                    academic_year_id: academicYear?.id,
                    class_id: selectedClassId,
                    student_id: studentId,
                    quarter: parseInt(selectedQuarter),
                    written_works_score: g.written_works_score,
                    written_works_total: g.written_works_total,
                    performance_tasks_score: g.performance_tasks_score,
                    performance_tasks_total: g.performance_tasks_total,
                    quarterly_assessment_score: g.quarterly_assessment_score,
                    quarterly_assessment_total: g.quarterly_assessment_total,
                    initial_grade: g.initial_grade,
                    transmuted_grade: g.transmuted_grade
                };
            });

            const { error } = await supabase.from('grades').upsert(upserts, { onConflict: 'class_id,student_id,quarter' });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-gradesheet'] });
            toast({ title: 'Grades saved successfully' });
            setHasChanges(false);
        },
        onError: (err) => toast({ title: 'Error saving grades', description: err.message, variant: 'destructive' })
    });

    return (
        <AdminLayout title="">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Grading Sheets</h2>
                    <p className="text-muted-foreground">Manage student grades for AY {academicYear?.label || '...'}.</p>
                </div>
                {hasChanges && (
                    <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-4 h-4" />}
                        Save Changes
                    </Button>
                )}
            </div>

            {/* Controls */}
            <Card className="mb-6">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <span className="text-sm font-medium">Section</span>
                        <Select value={selectedSectionId || ''} onValueChange={setSelectedSectionId}>
                            <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                            <SelectContent>
                                {sections?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} (G{s.grade_level})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <span className="text-sm font-medium">Subject Class</span>
                        <Select value={selectedClassId || ''} onValueChange={setSelectedClassId} disabled={!selectedSectionId}>
                            <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                            <SelectContent>
                                {classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.subject?.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <span className="text-sm font-medium">Quarter</span>
                        <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1st Quarter</SelectItem>
                                <SelectItem value="2">2nd Quarter</SelectItem>
                                <SelectItem value="3">3rd Quarter</SelectItem>
                                <SelectItem value="4">4th Quarter</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <span className="text-sm font-medium flex items-center"><Calculator className="w-3 h-3 mr-1" /> Weights (%)</span>
                        <div className="flex gap-2 text-sm">
                            <Input className="w-16 h-8 text-center" value={weights.ww} onChange={e => setWeights({ ...weights, ww: parseInt(e.target.value) || 0 })} placeholder="WW" />
                            <Input className="w-16 h-8 text-center" value={weights.pt} onChange={e => setWeights({ ...weights, pt: parseInt(e.target.value) || 0 })} placeholder="PT" />
                            <Input className="w-16 h-8 text-center" value={weights.qa} onChange={e => setWeights({ ...weights, qa: parseInt(e.target.value) || 0 })} placeholder="QA" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Grade Sheet */}
            <Card className="min-h-[500px]">
                <CardContent className="p-0">
                    {!selectedClassId ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                            <p>Select a Section and Class to view the grading sheet.</p>
                        </div>
                    ) : gradeSheetLoading || isFetchingGrades ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
                    ) : gradeSheet?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <p>No students enrolled in this section.</p>
                            <Button variant="link" onClick={() => window.location.href = '/admin/classes'}>Go to Classes to enroll students</Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                                        <TableHead className="w-[200px]">Student Name</TableHead>
                                        {/* Group Headers */}
                                        <TableHead colSpan={2} className="text-center border-l border-r border-slate-200 bg-blue-50/50 text-blue-700">Written Works ({weights.ww}%)</TableHead>
                                        <TableHead colSpan={2} className="text-center border-r border-slate-200 bg-emerald-50/50 text-emerald-700">Performance Tasks ({weights.pt}%)</TableHead>
                                        <TableHead colSpan={2} className="text-center border-r border-slate-200 bg-amber-50/50 text-amber-700">Quarterly Assessment ({weights.qa}%)</TableHead>
                                        <TableHead className="text-center bg-slate-100 font-bold">Initial</TableHead>
                                        <TableHead className="text-center bg-slate-200 font-bold">FINAL</TableHead>
                                    </TableRow>
                                    <TableRow className="text-xs text-muted-foreground bg-slate-50 hover:bg-slate-50">
                                        <TableHead className="font-normal"></TableHead>
                                        <TableHead className="text-center border-l w-[80px]">Score</TableHead>
                                        <TableHead className="text-center border-r w-[80px]">Total</TableHead>
                                        <TableHead className="text-center w-[80px]">Score</TableHead>
                                        <TableHead className="text-center border-r w-[80px]">Total</TableHead>
                                        <TableHead className="text-center w-[80px]">Score</TableHead>
                                        <TableHead className="text-center border-r w-[80px]">Total</TableHead>
                                        <TableHead className="text-center bg-slate-100">Grade</TableHead>
                                        <TableHead className="text-center bg-slate-200">Grade</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gradeSheet.map(({ student }) => {
                                        const g = gradesBuffer[student.id];
                                        if (!g) return null;
                                        return (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-medium">{student.name}</TableCell>

                                                {/* Written Works */}
                                                <TableCell className="border-l p-1">
                                                    <Input type="number" className="h-8 text-center border-transparent hover:border-input focus:border-input"
                                                        value={g.written_works_score}
                                                        onChange={e => calculateRow(student.id, 'ww', 'score', parseFloat(e.target.value) || 0)}
                                                    />
                                                </TableCell>
                                                <TableCell className="border-r p-1">
                                                    <Input type="number" className="h-8 text-center bg-slate-50 text-muted-foreground"
                                                        value={g.written_works_total}
                                                        onChange={e => calculateRow(student.id, 'ww', 'total', parseFloat(e.target.value) || 0)}
                                                    />
                                                </TableCell>

                                                {/* Performance Tasks */}
                                                <TableCell className="p-1">
                                                    <Input type="number" className="h-8 text-center border-transparent hover:border-input focus:border-input"
                                                        value={g.performance_tasks_score}
                                                        onChange={e => calculateRow(student.id, 'pt', 'score', parseFloat(e.target.value) || 0)}
                                                    />
                                                </TableCell>
                                                <TableCell className="border-r p-1">
                                                    <Input type="number" className="h-8 text-center bg-slate-50 text-muted-foreground"
                                                        value={g.performance_tasks_total}
                                                        onChange={e => calculateRow(student.id, 'pt', 'total', parseFloat(e.target.value) || 0)}
                                                    />
                                                </TableCell>

                                                {/* Quarterly Assessment */}
                                                <TableCell className="p-1">
                                                    <Input type="number" className="h-8 text-center border-transparent hover:border-input focus:border-input"
                                                        value={g.quarterly_assessment_score}
                                                        onChange={e => calculateRow(student.id, 'qa', 'score', parseFloat(e.target.value) || 0)}
                                                    />
                                                </TableCell>
                                                <TableCell className="border-r p-1">
                                                    <Input type="number" className="h-8 text-center bg-slate-50 text-muted-foreground"
                                                        value={g.quarterly_assessment_total}
                                                        onChange={e => calculateRow(student.id, 'qa', 'total', parseFloat(e.target.value) || 0)}
                                                    />
                                                </TableCell>

                                                {/* Results */}
                                                <TableCell className="text-center font-mono bg-slate-50">
                                                    {g.initial_grade.toFixed(2)}
                                                </TableCell>
                                                <TableCell className={`text-center font-bold text-lg bg-slate-100 ${g.transmuted_grade < 75 ? 'text-destructive' : 'text-emerald-700'}`}>
                                                    {g.transmuted_grade}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
