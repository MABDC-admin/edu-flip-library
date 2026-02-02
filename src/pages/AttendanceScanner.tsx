import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Clock, UserCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AttendanceScanner() {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const { school, academicYear } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
        );

        scanner.render(onScanSuccess, onScanError);

        async function onScanSuccess(decodedText: string) {
            if (isProcessing) return;

            setScanResult(decodedText);
            setIsProcessing(true);

            try {
                // Expected format: studentId|schoolPrefix|academicYear
                const [studentId, prefix] = decodedText.split('|');

                if (!studentId || !prefix) {
                    throw new Error('Invalid QR Code format');
                }

                // 1. Find profile by student_id
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, name')
                    .eq('student_id', studentId)
                    .single();

                if (profileError || !profile) {
                    throw new Error('Student profile not found');
                }

                // 2. Log attendance
                const { error: logError } = await supabase.from('attendance_logs' as any).insert({
                    profile_id: profile.id,
                    school_id: school?.id,
                    academic_year_id: academicYear?.id,
                    check_in_time: new Date().toISOString(),
                    status: 'present'
                });

                if (logError) throw logError;

                toast({
                    title: 'Check-in Successful!',
                    description: `Welcome, ${profile.name}!`,
                    variant: 'default',
                });

            } catch (error: any) {
                toast({
                    title: 'Scan Error',
                    description: error.message,
                    variant: 'destructive',
                });
            } finally {
                setTimeout(() => {
                    setIsProcessing(false);
                    setScanResult(null);
                }, 3000); // Wait 3 seconds before next scan
            }
        }

        function onScanError() {
            // Ignore common errors
        }

        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, [school, academicYear, isProcessing]);

    return (
        <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center justify-center">
            <div className="w-full max-w-md space-y-4">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/admin/attendance')}
                    className="gap-2 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Button>

                <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
                    <CardHeader className="bg-primary text-primary-foreground text-center">
                        <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                            <Clock className="w-6 h-6" />
                        </div>
                        <CardTitle>Campus Check-in</CardTitle>
                        <CardDescription className="text-primary-foreground/80">
                            {school?.name || 'Select School in Admin Dashboard'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div id="reader" className="w-full"></div>

                        {scanResult && (
                            <div className="p-6 bg-white border-t space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                {isProcessing ? (
                                    <div className="flex flex-col items-center gap-2 text-primary">
                                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <p className="font-medium">Validating QR Code...</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 text-success">
                                        <UserCheck className="w-8 h-8" />
                                        <div>
                                            <p className="font-bold">Last Scanned:</p>
                                            <p className="text-sm opacity-80">{scanResult}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!scanResult && (
                            <div className="p-8 text-center bg-white space-y-4">
                                <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3 text-left">
                                    <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Point your student ID card QR code towards the camera.
                                        The system will automatically log your attendance for <b>{academicYear?.label || 'Current Year'}</b>.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Powered by Edu-Flip Identity System
                </p>
            </div>
        </div>
    );
}
