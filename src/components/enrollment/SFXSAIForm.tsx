import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const sfxsaiSchema = z.object({
    fullName: z.string().min(2, 'Full name is required'),
    birthDate: z.string().min(1, 'Birth date is required'),
    gender: z.string().min(1, 'Gender is required'),
    gradeLevel: z.string().min(1, 'Grade level is required'),

    // Standard Address
    address: z.string().min(5, 'Address is required'),
    city: z.string().min(1, 'City is required'),

    guardianName: z.string().min(2, 'Guardian name is required'),
    guardianContact: z.string().min(7, 'Contact number is required'),
    guardianEmail: z.string().email('Invalid email address').optional(),
});

type SFXSAIFormData = z.infer<typeof sfxsaiSchema>;

interface SFXSAIFormProps {
    onSubmit: (data: SFXSAIFormData) => void;
    isLoading?: boolean;
}

export function SFXSAIForm({ onSubmit, isLoading }: SFXSAIFormProps) {
    const { register, handleSubmit, formState: { errors }, setValue } = useForm<SFXSAIFormData>({
        resolver: zodResolver(sfxsaiSchema),
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader className="bg-success/5 border-b border-success/10">
                    <CardTitle className="text-success-foreground">Student's Enrollment Form (SFXSAI)</CardTitle>
                    <CardDescription>St. Francis Xavier Smart Academy Inc - Enrollment System</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input {...register('fullName')} placeholder="Surname, First Name, MI" />
                            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="birthDate">Date of Birth</Label>
                                <Input {...register('birthDate')} type="date" />
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
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm text-success-foreground">Address Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="address">Residential Address</Label>
                                <Input {...register('address')} placeholder="House No., Street, Brgy" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">City / Province</Label>
                                <Input {...register('city')} />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm text-success-foreground">Emergency Contact</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="guardianName">Parent / Guardian Name</Label>
                                <Input {...register('guardianName')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="guardianContact">Contact Number</Label>
                                <Input {...register('guardianContact')} />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6">
                        <Button size="lg" className="w-full bg-success hover:bg-success/90" disabled={isLoading}>
                            {isLoading ? 'Registering...' : 'Submit SFXSAI Enrollment'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}
