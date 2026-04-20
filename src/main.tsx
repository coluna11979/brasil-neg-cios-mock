import "./pre-boot"; // ⚡ Deve ser o PRIMEIRO import — captura recovery token antes do Supabase
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
