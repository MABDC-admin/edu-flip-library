import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

const INITIAL_FORM_DATA = {
    // Section 1: Learner Info
    learnerName: '',
    dob: '',
    age: '',
    pob: '',
    motherTongue: '',
    religion: '',

    // Addresses
    phAddress: {
        houseNo: '',
        barangay: '',
        city: '',
        province: ''
    },
    uaeAddress: '',

    // Section 2: Parents
    fatherName: '',
    fatherEducation: '',
    fatherOccupation: '',
    fatherContact: '',

    motherName: '',
    motherEducation: '',
    motherOccupation: '',
    motherContact: '',
};

export default function PublicEnrollment() {
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const submitMutation = useMutation({
        mutationFn: async () => {
            // 1. Fetch default school (MABDC) and active AY
            const { data: mabdc } = await (supabase as any).from('schools').select('id').eq('short_name', 'MABDC').single();
            const { data: ay } = await (supabase as any).from('academic_years').select('id').eq('is_active', true).single();

            if (!mabdc || !ay) throw new Error("System configuration error: No active school/year found.");

            // 2. Prepare JSON
            const submission = {
                learner: {
                    name: formData.learnerName,
                    dob: formData.dob,
                    age: formData.age,
                    pob: formData.pob,
                    mother_tongue: formData.motherTongue,
                    religion: formData.religion,
                    address_ph: formData.phAddress,
                    address_uae: formData.uaeAddress
                },
                parents: {
                    father: {
                        name: formData.fatherName,
                        education: formData.fatherEducation,
                        occupation: formData.fatherOccupation,
                        contact: formData.fatherContact
                    },
                    mother: {
                        name: formData.motherName,
                        education: formData.motherEducation,
                        occupation: formData.motherOccupation,
                        contact: formData.motherContact
                    }
                }
            };

            // 3. Insert
            const { error } = await (supabase as any).from('enrollments').insert({
                school_id: mabdc.id,
                academic_year_id: ay.id,
                form_name: "Learner's Profile Form",
                form_data: submission,
                status: 'pending'
            });

            if (error) throw error;
        },
        onSuccess: () => {
            setIsSubmitted(true);
            toast({ title: 'Application Submitted!', description: 'We have received your enrollment form.' });
        },
        onError: (err) => {
            toast({ title: 'Submission Failed', description: err.message, variant: 'destructive' });
        }
    });

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updatePhAddress = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            phAddress: { ...prev.phAddress, [field]: value }
        }));
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Application Received</h2>
                    <p className="text-muted-foreground mb-6">
                        Thank you for enrolling at MABDC. Your application is now under review by the registrar.
                    </p>
                    <Button onClick={() => window.location.reload()}>Submit Another</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-blue-900">MABDC Enrollment</h1>
                    <p className="text-muted-foreground">Learner's Profile Form • SY 2026-2027</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {step === 1 && "Learner Information"}
                            {step === 2 && "Address Information"}
                            {step === 3 && "Parent/Guardian Information"}
                            {step === 4 && "Review & Submit"}
                        </CardTitle>
                        <CardDescription>Step {step} of 4</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {step === 1 && (
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label>Learner's Name (Last, First Middle)</Label>
                                    <Input placeholder="DELA CRUZ, JUAN LUNA" value={formData.learnerName} onChange={e => updateField('learnerName', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Date of Birth</Label>
                                        <Input type="date" value={formData.dob} onChange={e => updateField('dob', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Age</Label>
                                        <Input type="number" value={formData.age} onChange={e => updateField('age', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Place of Birth</Label>
                                    <Input placeholder="City, Country" value={formData.pob} onChange={e => updateField('pob', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Mother Tongue</Label>
                                        <Input placeholder="e.g. Tagalog" value={formData.motherTongue} onChange={e => updateField('motherTongue', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Religion</Label>
                                        <Input placeholder="e.g. Roman Catholic" value={formData.religion} onChange={e => updateField('religion', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="grid gap-6">
                                <div className="space-y-4 border p-4 rounded-lg bg-slate-50/50">
                                    <Label className="text-base font-semibold">Philippine Address</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label>House # / Street / Purok</Label>
                                            <Input value={formData.phAddress.houseNo} onChange={e => updatePhAddress('houseNo', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Barangay</Label>
                                            <Input value={formData.phAddress.barangay} onChange={e => updatePhAddress('barangay', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Municipality/City</Label>
                                            <Input value={formData.phAddress.city} onChange={e => updatePhAddress('city', e.target.value)} />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <Label>Province</Label>
                                            <Input value={formData.phAddress.province} onChange={e => updatePhAddress('province', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-base font-semibold">UAE Address</Label>
                                    <Input placeholder="Flat, Building, Area, Emirate" value={formData.uaeAddress} onChange={e => updateField('uaeAddress', e.target.value)} />
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="grid gap-8">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-blue-900 border-b pb-2">Father's Information</h3>
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input value={formData.fatherName} onChange={e => updateField('fatherName', e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Educational Attainment</Label>
                                            <Input value={formData.fatherEducation} onChange={e => updateField('fatherEducation', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Occupation</Label>
                                            <Input value={formData.fatherOccupation} onChange={e => updateField('fatherOccupation', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contact No.</Label>
                                        <Input value={formData.fatherContact} onChange={e => updateField('fatherContact', e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold text-rose-900 border-b pb-2">Mother's Information</h3>
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input value={formData.motherName} onChange={e => updateField('motherName', e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Educational Attainment</Label>
                                            <Input value={formData.motherEducation} onChange={e => updateField('motherEducation', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Occupation</Label>
                                            <Input value={formData.motherOccupation} onChange={e => updateField('motherOccupation', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Contact No.</Label>
                                        <Input value={formData.motherContact} onChange={e => updateField('motherContact', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-6">
                                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                                    <p className="text-sm text-yellow-800">Please review all information before submitting. Once submitted, you cannot edit this form online.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-semibold block text-muted-foreground">Learner</span>
                                        <p>{formData.learnerName}</p>
                                    </div>
                                    <div>
                                        <span className="font-semibold block text-muted-foreground">DOB / Age</span>
                                        <p>{formData.dob} ({formData.age} yo)</p>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="font-semibold block text-muted-foreground">Address</span>
                                        <p>{formData.uaeAddress}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex justify-between">
                        {step > 1 ? (
                            <Button variant="outline" onClick={() => setStep(step - 1)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                            </Button>
                        ) : <div></div>}

                        {step < 4 ? (
                            <Button onClick={() => setStep(step + 1)}>
                                Next <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                                {submitMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                                Submit Enrollment
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
