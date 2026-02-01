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
    <div className="space-y-4">
      {/* Grade Group Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedGroup === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleGroupClick('all')}
          className={cn(selectedGroup === 'all' && 'gradient-primary')}
        >
          All Grades
        </Button>
        {(Object.keys(GRADE_GROUPS) as Array<keyof typeof GRADE_GROUPS>).map((group) => (
          <Button
            key={group}
            variant={selectedGroup === group ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleGroupClick(group)}
            className={cn(
              selectedGroup === group && 'border-2',
              gradeGroupColors[group]
            )}
          >
            Grades {group}
          </Button>
        ))}
      </div>

      {/* Individual Grade Chips */}
      {selectedGroup !== 'all' && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <span className="text-sm text-muted-foreground self-center mr-2">
            Fine-tune:
          </span>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
            <Button
              key={grade}
              variant={selectedGrades.includes(grade) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleGradeToggle(grade)}
              className={cn(
                "h-8 px-3 rounded-full text-xs font-medium transition-all",
                selectedGrades.includes(grade)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              {GRADE_LABELS[grade]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
