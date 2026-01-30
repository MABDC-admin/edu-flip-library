import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
            GradeFlip Books
          </h1>
          <p className="text-muted-foreground">
            Digital Flipbook Library Management System
          </p>
        </div>

        <div className="grid gap-4">
          <Button asChild size="lg" className="w-full">
            <Link href="/admin/books">
              <BookOpen className="mr-2 h-5 w-5" />
              Enter Library
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/api/auth/signin">
              <Shield className="mr-2 h-5 w-5" />
              Admin Login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
