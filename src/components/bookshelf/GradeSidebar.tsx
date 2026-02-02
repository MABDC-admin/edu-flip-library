import { Grid2X2 } from 'lucide-react';
import { GRADE_LABELS } from '@/types/database';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GradeSidebarProps {
    activeGrade: number | 'all';
    onGradeChange: (grade: number | 'all') => void;
    profile: any;
    isAdmin?: boolean;
    isTeacher?: boolean;
}

export function GradeSidebar({
    activeGrade,
    onGradeChange,
    profile,
    isAdmin,
    isTeacher
}: GradeSidebarProps) {
    const showAllOption = isAdmin || isTeacher;

    return (
        <div className="sticky top-24 z-40 hidden xl:block self-start">
            <TooltipProvider delayDuration={0}>
                <div className="flex flex-col gap-2 p-2 bg-white/70 backdrop-blur-2xl border border-white/40 rounded-[1.75rem] shadow-[0_4px_24px_-1px_rgba(0,0,0,0.1),0_1px_8px_-1px_rgba(0,0,0,0.06)]">
                    {showAllOption && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => onGradeChange('all')}
                                    className={cn(
                                        "w-11 h-11 flex items-center justify-center transition-all duration-300 rounded-2xl",
                                        activeGrade === 'all'
                                            ? "bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.2)]"
                                            : "text-slate-500 hover:bg-slate-200/50"
                                    )}
                                >
                                    <Grid2X2 className="w-5 h-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-slate-900 border-none text-white font-semibold px-3 py-1.5 rounded-lg text-xs">
                                All Grades
                            </TooltipContent>
                        </Tooltip>
                    )}

                    <div className="w-8 h-px bg-slate-200/50 mx-auto my-0.5" />

                    {Object.entries(GRADE_LABELS)
                        .filter(([grade]) => grade !== '12')
                        .map(([grade, label]) => {
                            const gradeNum = parseInt(grade);
                            const isActive = activeGrade === gradeNum;
                            const isUserGrade = gradeNum === profile?.grade_level;

                            return (
                                <Tooltip key={grade}>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => onGradeChange(gradeNum)}
                                            className={cn(
                                                "w-11 h-11 flex flex-col items-center justify-center rounded-2xl transition-all duration-300 relative group",
                                                isActive
                                                    ? "bg-primary text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                                                    : "text-slate-500 hover:bg-slate-200/50"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-[8px] font-bold uppercase leading-none mb-0.5",
                                                isActive ? "text-white/80" : "text-slate-400 group-hover:text-slate-500"
                                            )}>
                                                {gradeNum === 11 ? '' : 'Grade'}
                                            </span>
                                            <span className="text-sm font-bold leading-none">
                                                {gradeNum === 11 ? 'SHS' : gradeNum}
                                            </span>

                                            {isUserGrade && !isActive && (
                                                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-slate-900 border-none text-white font-semibold px-3 py-1.5 rounded-lg text-xs">
                                        {label}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                </div>
            </TooltipProvider>
        </div>
    );
}
