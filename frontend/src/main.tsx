import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeApp } from "./lib/bootstrap";

// Initialize app before rendering
initializeApp();

createRoot(document.getElementById("root")!).render(<App />);
