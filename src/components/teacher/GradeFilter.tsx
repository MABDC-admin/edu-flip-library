import { Button } from '@/components/ui/button';
import { GRADE_LABELS } from '@/types/database';
import { cn } from '@/lib/utils';

// Grade level groupings for teachers
export const GRADE_GROUPS = {
  'K-2': [1, 2],
  '3-5': [3, 4, 5],
  '6-8': [6, 7, 8],
  '9-12': [9, 10, 11, 12],
} as const;

export type GradeGroup = keyof typeof GRADE_GROUPS | 'all';

interface GradeFilterProps {
  selectedGroup: GradeGroup;
  onGroupChange: (group: GradeGroup) => void;
  selectedGrades: number[];
  onGradesChange: (grades: number[]) => void;
}

const gradeGroupColors: Record<GradeGroup, string> = {
  'all': 'bg-muted hover:bg-muted/80',
  'K-2': 'bg-grade-1/10 hover:bg-grade-1/20 text-grade-1 border-grade-1/20',
  '3-5': 'bg-grade-4/10 hover:bg-grade-4/20 text-grade-4 border-grade-4/20',
  '6-8': 'bg-grade-7/10 hover:bg-grade-7/20 text-grade-7 border-grade-7/20',
  '9-12': 'bg-grade-10/10 hover:bg-grade-10/20 text-grade-10 border-grade-10/20',
};

export function GradeFilter({
  selectedGroup,
  onGroupChange,
  selectedGrades,
  onGradesChange,
}: GradeFilterProps) {
  const handleGroupClick = (group: GradeGroup) => {
    onGroupChange(group);
    if (group === 'all') {
      onGradesChange([]);
    } else {
      onGradesChange([...GRADE_GROUPS[group]]);
    }
  };

  const handleGradeToggle = (grade: number) => {
    if (selectedGrades.includes(grade)) {
      const newGrades = selectedGrades.filter((g) => g !== grade);
      onGradesChange(newGrades);
      // Update group based on remaining grades
      if (newGrades.length === 0) {
        onGroupChange('all');
      }
    } else {
      const newGrades = [...selectedGrades, grade].sort((a, b) => a - b);
      onGradesChange(newGrades);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Quick Select Groups */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          Range Select:
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedGroup === 'all' && selectedGrades.length === 0 ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleGroupClick('all')}
            className={cn(selectedGroup === 'all' && selectedGrades.length === 0 && 'gradient-primary')}
          >
            All Grades
          </Button>
          {(Object.keys(GRADE_GROUPS) as Array<keyof typeof GRADE_GROUPS>).map((group) => {
            const isGroupActive = selectedGroup === group;
            return (
              <Button
                key={group}
                variant={isGroupActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleGroupClick(group)}
                className={cn(
                  isGroupActive && 'border-2',
                  gradeGroupColors[group]
                )}
              >
                Grades {group}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Individual Grade Switcher - ALWAYS VISIBLE */}
      <div className="space-y-3">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          Select Grade Level:
        </span>
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
