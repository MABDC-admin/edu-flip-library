import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/pdf-config";

// Worker is configured globally in src/lib/pdf-config.ts

createRoot(document.getElementById("root")!).render(<App />);
