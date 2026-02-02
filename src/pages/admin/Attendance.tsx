import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scan, Calendar, Download, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminAttendance() {
    const navigate = useNavigate();

    return (
        <AdminLayout title="Attendance Management">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Scan className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Daily Scanner</h3>
                            <p className="text-sm text-muted-foreground">Scan student QR codes for check-in</p>
                        </div>
                        <Button className="w-full" onClick={() => navigate('/admin/attendance/scanner')}>Open Scanner</Button>
                    </Card>

                    <Card className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-success" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Weekly Reports</h3>
                            <p className="text-sm text-muted-foreground">Generate attendance summaries</p>
                        </div>
                        <Button variant="outline" className="w-full">View Reports</Button>
                    </Card>

                    <Card className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                            <Download className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Export Data</h3>
                            <p className="text-sm text-muted-foreground">Download CSV attendance logs</p>
                        </div>
                        <Button variant="outline" className="w-full">Download CSV</Button>
                    </Card>
                </div>

                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Clock className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold">No Attendance Logs Today</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            Check-ins will appear here once students start scanning their QR codes.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
