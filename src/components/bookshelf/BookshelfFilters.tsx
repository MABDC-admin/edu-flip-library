import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface BookshelfFiltersProps {
    searchQuery: string;
    onSearchChange: (val: string) => void;
}

export function BookshelfFilters({
    searchQuery,
    onSearchChange
}: BookshelfFiltersProps) {
    return (
        <div className="flex flex-col xl:flex-row items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
            <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search library..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9 h-10 bg-white/50 backdrop-blur-sm border-slate-200 focus:border-primary/50 transition-all rounded-xl shadow-sm text-sm"
                />
            </div>
        </div>
    );
}
