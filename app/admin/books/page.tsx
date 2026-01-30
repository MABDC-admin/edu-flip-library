import { getBooks } from "@/app/actions";
import { BooksClient } from "./books-client";

export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

export default async function BooksPage() {
    const result = await getBooks();

    if (!result.success || !result.data) {
        return (
            <div className="p-4 text-red-500">
                Error fetching books: {result.error}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Manage Books</h2>
                    <p className="text-muted-foreground">
                        Add and manage your flipbook library
                    </p>
                </div>
            </div>

            <BooksClient initialBooks={result.data} />
        </div>
    );
}
