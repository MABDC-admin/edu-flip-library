import { BookOpen } from 'lucide-react';
import { BookWithProgress } from '@/types/database';
import { BookGrid } from '@/components/books/BookGrid';

interface InternalGroupedViewProps {
    groupedBooks: Record<number, Record<string, BookWithProgress[]>>;
    searchQuery: string;
}

export function InternalGroupedView({ groupedBooks, searchQuery }: InternalGroupedViewProps) {
    const sortedGrades = Object.keys(groupedBooks).map(Number).sort((a, b) => a - b);

    if (sortedGrades.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <BookOpen className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No books found</h3>
                <p className="text-muted-foreground">Try a different search term across the library</p>
            </div>
        );
    }

    return (
        <div className="space-y-16">
            {sortedGrades.map((grade) => {
                const subjectsForGrade = groupedBooks[grade];

                // Check if any subject in this grade has books matching the search
                const hasResultsInGrade = Object.values(subjectsForGrade).some(subjBooks =>
                    searchQuery
                        ? subjBooks.some(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()))
                        : true
                );

                if (!hasResultsInGrade) return null;

                return (
                    <div key={grade} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-8 pl-4 border-l-2 border-slate-50">
                            {Object.entries(subjectsForGrade)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([subj, subjBooks]) => {
                                    const matchingBooks = searchQuery
                                        ? subjBooks.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                        : subjBooks;

                                    if (matchingBooks.length === 0) return null;

                                    return (
                                        <div key={subj} className="space-y-4">
                                            {subj !== 'Uncategorized' && (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                                                        <BookOpen className="w-4 h-4 text-primary/60" />
                                                    </div>
                                                    <h4 className="text-lg font-semibold text-slate-700">{subj}</h4>
                                                </div>
                                            )}

                                            <BookGrid
                                                books={matchingBooks}
                                                externalSearchQuery={searchQuery}
                                                emptyMessage={`No books found in ${subj}`}
                                            />
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
