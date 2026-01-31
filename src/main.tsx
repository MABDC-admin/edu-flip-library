import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/pdf-config";

// react-pageflip for 3D page curl animations
import HTMLFlipBook from 'react-pageflip';

// Worker is configured globally in src/lib/pdf-config.ts

createRoot(document.getElementById("root")!).render(<App />);
