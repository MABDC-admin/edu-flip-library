import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const nextAuth = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            authorize: async (credentials) => {
                const { email, password } = credentials as { email: string; password: string }

                if (!email || !password) return null

                const user = await prisma.user.findUnique({
                    where: { email }
                })

                if (!user || !user.password) return null

                const isValid = await bcrypt.compare(password, user.password)

                if (!isValid) return null

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role
            }
            return session
        },
    },
})

export const { handlers, auth, signIn, signOut } = nextAuth
