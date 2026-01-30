'use server'

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getBooks() {
    try {
        const books = await prisma.book.findMany({
            orderBy: { created_at: 'desc' }
        });
        // Serialize dates if needed, but Next.js handles Date objects in newer versions (or verify)
        // Prisma returns Date objects. Next.js Server Actions can return Date objects to Client Components.
        return { success: true, data: books };
    } catch (error) {
        console.error("Failed to fetch books:", error);
        return { success: false, error: "Failed to fetch books" };
    }
}

export async function createBook(data: { title: string; gradeLevel: number; html5Url?: string; coverUrl?: string }) {
    try {
        const book = await prisma.book.create({
            data: {
                title: data.title,
                grade_level: data.gradeLevel,
                html5_url: data.html5Url,
                cover_url: data.coverUrl,
                status: 'ready'
            }
        });
        revalidatePath('/admin/books');
        return { success: true, data: book };
    } catch (error) {
        console.error("Failed to create book:", error);
        return { success: false, error: "Failed to create book" };
    }
}

export async function updateBook(id: string, data: { title: string; gradeLevel: number }) {
    try {
        const book = await prisma.book.update({
            where: { id },
            data: {
                title: data.title,
                grade_level: data.gradeLevel,
            }
        });
        revalidatePath('/admin/books');
        return { success: true, data: book };
    } catch (error) {
        console.error("Failed to update book:", error);
        return { success: false, error: "Failed to update book" };
    }
}

export async function deleteBook(id: string) {
    try {
        await prisma.book.delete({
            where: { id }
        });
        revalidatePath('/admin/books');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete book:", error);
        return { success: false, error: "Failed to delete book" };
    }
}
