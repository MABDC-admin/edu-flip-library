import { pdfjs } from 'react-pdf';

// Use Vite's native worker loading pattern
// This tells Vite to handle the worker as a separate entry point 
// and provides a URL that works both in dev and production.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

export { pdfjs };
