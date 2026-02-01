import { Button } from '@/components/ui/button';
import { GRADE_LABELS } from '@/types/database';
import { cn } from '@/lib/utils';

interface GradeFilterProps {
  selectedGrades: number[];
  onGradesChange: (grades: number[]) => void;
}

export function GradeFilter({
  selectedGrades,
  onGradesChange,
}: GradeFilterProps) {
  const handleGradeToggle = (grade: number) => {
    if (selectedGrades.includes(grade)) {
      const newGrades = selectedGrades.filter((g) => g !== grade);
      onGradesChange(newGrades);
    } else {
      const newGrades = [...selectedGrades, grade].sort((a, b) => a - b);
      onGradesChange(newGrades);
    }
  };

  return (
    <div className="w-full">
      {/* Individual Grade Switcher - ALWAYS VISIBLE */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => {
            const isActive = selectedGrades.includes(grade);
            return (
              <Button
                key={grade}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleGradeToggle(grade)}
                className={cn(
                  "h-10 px-4 rounded-xl text-sm font-semibold transition-all shadow-sm border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary scale-105"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                )}
              >
                {GRADE_LABELS[grade]}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
