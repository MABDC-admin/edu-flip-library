import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBooks } from '@/hooks/useBooks';
import { BookWithProgress } from '@/types/database';

export function useBookshelf() {
    const { profile, isAdmin, isTeacher, isLoading: authLoading } = useAuth();
    const { data: books, isLoading: booksLoading } = useBooks();

    const [searchQuery, setSearchQuery] = useState('');

    // Normalize Grade 12 to 11 for Senior High filtering
    const initialGrade = profile?.grade_level === 12 ? 11 : (profile?.grade_level || 'all');
    const [activeGrade, setActiveGrade] = useState<number | 'all'>(initialGrade);
    const [activeSubject, setActiveSubject] = useState<string>('all');

    // Sync activeGrade with profile's grade level when it loads for students
    useEffect(() => {
        if (profile?.grade_level && activeGrade === 'all' && !isAdmin && !isTeacher) {
            const normalizedGrade = profile.grade_level === 12 ? 11 : profile.grade_level;
            setActiveGrade(normalizedGrade);
        }
    }, [profile?.grade_level, isAdmin, isTeacher]);

    const handleGradeChange = (grade: number | 'all') => {
        setActiveGrade(grade);
        setActiveSubject('all');
    };

    // Filter accessible books based on role
    const accessibleBooks = useMemo(() => {
        const all = books || [];
        if (isAdmin || isTeacher) return all;
        return all.filter(b => !b.is_teacher_only);
    }, [books, isAdmin, isTeacher]);

    // Apply global filters (Grade + Search)
    const filteredBooks = useMemo(() => {
        let result = [...accessibleBooks];

        if (activeGrade !== 'all') {
            result = result.filter(b => {
                if (activeGrade === 11) return b.grade_level === 11 || b.grade_level === 12;
                return b.grade_level === activeGrade;
            });
        }

        if (searchQuery) {
            result = result.filter(b =>
                b.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Sort: Internal first, then Quipper, then Title
        return result.sort((a, b) => {
            if (a.source === 'internal' && b.source !== 'internal') return -1;
            if (a.source !== 'internal' && b.source === 'internal') return 1;
            return a.title.localeCompare(b.title);
        });
    }, [accessibleBooks, activeGrade, searchQuery]);

    // Subjects available in the active selection
    const subjectsInActiveGrade = useMemo(() => {
        const subjects = new Set<string>();
        filteredBooks.forEach(b => subjects.add(b.subject || 'Uncategorized'));
        return Array.from(subjects).sort();
    }, [filteredBooks]);

    // Grouping logic for the unified view
    const unifiedGrouped = useMemo(() => {
        const grouped = filteredBooks.reduce((acc: Record<string, BookWithProgress[]>, book) => {
            const subject = book.subject || 'Uncategorized';
            if (!acc[subject]) acc[subject] = [];
            acc[subject].push(book);
            return acc;
        }, {});

        // If a specific subject is selected, return only that
        if (activeSubject !== 'all') {
            return { [activeSubject]: grouped[activeSubject] || [] };
        }

        return grouped;
    }, [filteredBooks, activeSubject]);

    return {
        state: {
            searchQuery,
            activeGrade,
            activeSubject,
            isLoading: authLoading || booksLoading,
            isAdmin,
            isTeacher
        },
        actions: {
            setSearchQuery,
            setActiveGrade: handleGradeChange,
            setActiveSubject
        },
        data: {
            unifiedGrouped,
            subjectsInActiveGrade
        }
    };
}
