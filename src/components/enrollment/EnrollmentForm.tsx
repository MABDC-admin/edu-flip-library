import { useAuth } from '@/contexts/AuthContext';
import { MABDCForm } from './MABDCForm';
import { SFXSAIForm } from './SFXSAIForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface EnrollmentFormProps {
    onSuccess?: () => void;
}

export function EnrollmentForm({ onSuccess }: EnrollmentFormProps) {
    const { school, academicYear } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (data: any) => {
        if (!school || !academicYear) {
            toast({
                title: 'Error',
                description: 'School or Academic Year not selected.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            // 1. Generate Student ID (calling the DB function)
            const { data: studentId, error: idError } = await (supabase as any).rpc('generate_next_student_id', {
                p_school_id: school.id,
                p_academic_year_id: academicYear.id
            });

            if (idError) throw idError;

            // 2. Prepare QR Data
            const qrData = `${studentId}|${school.short_name}|${academicYear.label}`;

            // 3. Save to Enrollments table
            const { error: enrollmentError } = await supabase.from('enrollments' as any).insert({
                school_id: school.id,
                academic_year_id: academicYear.id,
                form_name: school.slug === 'mabdc' ? "Learner's Enrollment Form" : "Student's Enrollment Form",
                status: 'pending',
                form_data: {
                    ...data,
                    studentIdGenerated: studentId,
                    qrDataGenerated: qrData
                }
            });

            if (enrollmentError) throw enrollmentError;

            toast({
                title: 'Enrollment Submitted!',
                description: `Student ID: ${studentId}. Application is now pending approval.`,
            });

            onSuccess?.();
        } catch (error: any) {
            console.error('Enrollment error:', error);
            toast({
                title: 'Enrollment Failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const slug = school?.slug?.toLowerCase();

    if (slug === 'mabdc') {
        return <MABDCForm onSubmit={handleSubmit} isLoading={isLoading} />;
    }

    if (slug === 'sfxsai') {
        return <SFXSAIForm onSubmit={handleSubmit} isLoading={isLoading} />;
    }

    return (
        <div className="p-8 text-center bg-slate-50 border rounded-xl">
            <p className="text-muted-foreground">Please select a school to load the enrollment form.</p>
            {school && (
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                    (Debug: Selected school slug is "{school.slug}")
                </p>
            )}
        </div>
    );
}
