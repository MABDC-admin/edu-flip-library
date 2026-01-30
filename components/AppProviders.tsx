'use client'

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            {children}
            <Toaster />
        </SessionProvider>
    )
}
