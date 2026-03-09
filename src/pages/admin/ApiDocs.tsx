import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const BASE_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/api`;

const TABLES = [
  'books', 'book_pages', 'book_annotations', 'profiles', 'schools',
  'academic_years', 'sections', 'student_sections', 'subjects',
  'classes', 'grades', 'enrollments', 'attendance_logs',
  'user_assigned_books', 'reading_progress', 'user_roles', 'student_id_sequences',
];

const endpoints = [
  { method: 'GET', path: '?table={table}', desc: 'List records (supports limit, offset, order, field filters)' },
  { method: 'GET', path: '?table={table}&id={uuid}', desc: 'Get a single record by ID' },
  { method: 'POST', path: '?table={table}', desc: 'Create record(s) — body: { data: {...} } or { data: [{...}] }' },
  { method: 'PUT', path: '?table={table}&id={uuid}', desc: 'Update a record — body: { data: {...} }' },
  { method: 'DELETE', path: '?table={table}&id={uuid}', desc: 'Delete a record by ID' },
];

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-800',
  POST: 'bg-blue-100 text-blue-800',
  PUT: 'bg-amber-100 text-amber-800',
  DELETE: 'bg-red-100 text-red-800',
};

export default function ApiDocs() {
  return (
    <AdminLayout title="API Reference">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Base URL</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="bg-muted px-3 py-2 rounded text-sm block break-all">{BASE_URL}</code>
            <p className="text-sm text-muted-foreground mt-3">
              All requests require the <code className="bg-muted px-1 rounded">x-api-key</code> header with your SYNC_API_KEY.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Endpoints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {endpoints.map((ep) => (
              <div key={ep.method + ep.path} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Badge className={`${methodColors[ep.method]} font-mono text-xs shrink-0`}>
                  {ep.method}
                </Badge>
                <div>
                  <code className="text-sm font-medium">{ep.path}</code>
                  <p className="text-sm text-muted-foreground mt-1">{ep.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {TABLES.map((t) => (
                <Badge key={t} variant="outline" className="font-mono text-xs">{t}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Example Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">{`# List all books
curl "${BASE_URL}?table=books" \\
  -H "x-api-key: YOUR_SYNC_API_KEY"

# Create a book
curl -X POST "${BASE_URL}?table=books" \\
  -H "x-api-key: YOUR_SYNC_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"data": {"title": "My Book", "grade_level": 3}}'

# Update a book
curl -X PUT "${BASE_URL}?table=books&id=UUID" \\
  -H "x-api-key: YOUR_SYNC_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"data": {"title": "Updated Title"}}'

# Delete a book
curl -X DELETE "${BASE_URL}?table=books&id=UUID" \\
  -H "x-api-key: YOUR_SYNC_API_KEY"`}</pre>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
