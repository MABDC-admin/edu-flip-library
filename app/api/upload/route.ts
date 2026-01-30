import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
    try {
        const data = await request.formData();
        const file: File | null = data.get("file") as unknown as File;

        if (!file) {
            return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Use environment variable for upload dir or default to public/uploads
        // For Railway, you might mount volume at /app/public/uploads
        const relativeUploadDir = "public/uploads";
        const uploadDir = path.join(process.cwd(), relativeUploadDir);

        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // Ignore error if directory exists
        }

        // Sanitize filename
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
        const filepath = path.join(uploadDir, filename);

        await writeFile(filepath, buffer);

        // Return relative URL for frontend
        const url = `/uploads/${filename}`;
        return NextResponse.json({ success: true, url });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 });
    }
}
