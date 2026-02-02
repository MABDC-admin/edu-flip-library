import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const mabdcSchema = z.object({
    // Basic Information
    fullName: z.string().min(2, 'Full name is required'),
    birthDate: z.string().min(1, 'Birth date is required'),
    gender: z.string().min(1, 'Gender is required'),
    gradeLevel: z.string().min(1, 'Grade level is required'),

    // UAE Address Support
    uaeAddress: z.object({
        houseNo: z.string().min(1, 'House No. is required'),
        street: z.string().min(1, 'Street is required'),
        area: z.string().min(1, 'Area is required'),
        city: z.string().min(1, 'City is required'),
        emirate: z.string().min(1, 'Emirate is required'),
    }),

    // Guardian Information
    guardianName: z.string().min(2, 'Guardian name is required'),
    guardianContact: z.string().min(10, 'Contact number is required'),
    guardianEmail: z.string().email('Invalid email address'),

    // DepEd Requirements
    lrn: z.string().optional(), // Learner Reference Number
    isTransferee: z.boolean().default(false),
});

type MABDCFormData = z.infer<typeof mabdcSchema>;

interface MABDCFormProps {
    onSubmit: (data: MABDCFormData) => void;
    isLoading?: boolean;
}

export function MABDCForm({ onSubmit, isLoading }: MABDCFormProps) {
    const { register, handleSubmit, formState: { errors }, setValue } = useForm<MABDCFormData>({
        resolver: zodResolver(mabdcSchema),
        defaultValues: {
            uaeAddress: {
                emirate: 'Dubai',
            }
        }
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader className="bg-primary/5">
                    <CardTitle>Learner's Enrollment Form (MABDC)</CardTitle>
                    <CardDescription>M.A Brain Development Center - DepEd Based Enrollment</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    {/* Basic Student Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name of Student</Label>
                            <Input {...register('fullName')} placeholder="Last Name, First Name, Middle Name" />
                            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="birthDate">Birth Date</Label>
                                <Input {...register('birthDate')} type="date" />
                                {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gender">Gender</Label>
                                <Select onValueChange={(val) => setValue('gender', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* UAE ADDRESS SECTION */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            UAE Residence Address
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="uaeAddress.houseNo">House / Flat No.</Label>
                                <Input {...register('uaeAddress.houseNo')} placeholder="e.g. Apt 402" />
                                {errors.uaeAddress?.houseNo && <p className="text-xs text-destructive">{errors.uaeAddress.houseNo.message}</p>}
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="uaeAddress.street">Street</Label>
                                <Input {...register('uaeAddress.street')} placeholder="e.g. Al Rigga Road" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="uaeAddress.area">Area / Community</Label>
                                <Input {...register('uaeAddress.area')} placeholder="e.g. Deira" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="uaeAddress.city">City</Label>
                                <Input {...register('uaeAddress.city')} placeholder="e.g. Dubai" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="uaeAddress.emirate">Emirate</Label>
                                <Select onValueChange={(val) => setValue('uaeAddress.emirate', val)} defaultValue="Dubai">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Emirate" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem>
                                        <SelectItem value="Dubai">Dubai</SelectItem>
                                        <SelectItem value="Sharjah">Sharjah</SelectItem>
                                        <SelectItem value="Ajman">Ajman</SelectItem>
                                        <SelectItem value="Umm Al Quwain">Umm Al Quwain</SelectItem>
                                        <SelectItem value="Ras Al Khaimah">Ras Al Khaimah</SelectItem>
                                        <SelectItem value="Fujairah">Fujairah</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Guardian Info */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            Parent / Guardian Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="guardianName">Guardian Name</Label>
                                <Input {...register('guardianName')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="guardianContact">UAE Contact Number</Label>
                                <Input {...register('guardianContact')} placeholder="+971 XX XXX XXXX" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="guardianEmail">Email Address</Label>
                                <Input {...register('guardianEmail')} type="email" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6">
                        <Button size="lg" className="w-full gradient-primary" disabled={isLoading}>
                            {isLoading ? 'Processing Enrollment...' : 'Submit MABDC Enrollment'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}
