import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReadBookPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const book = await prisma.book.findUnique({
        where: { id }
    });

    if (!book) {
        return (
            <div className="flex items-center justify-center min-h-screen text-muted-foreground">
                Book not found
            </div>
        )
    }

    if (!book.html5_url) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-muted-foreground">This book does not have an HTML5 URL configured.</p>
                <Button asChild variant="outline">
                    <Link href="/admin/books">Go Back</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
            {/* Header Overlay - Auto hides? Fixed for now */}
            <div className="absolute top-0 left-0 p-4 z-50 pointer-events-none">
                <Button variant="ghost" className="text-white hover:bg-white/20 pointer-events-auto backdrop-blur-sm bg-black/20" asChild>
                    <Link href="/admin/books">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Library
                    </Link>
                </Button>
            </div>

            <iframe
                src={book.html5_url}
                className="w-full h-screen border-0 bg-white"
                allowFullScreen
                title={book.title}
            />
        </div>
    )
}
