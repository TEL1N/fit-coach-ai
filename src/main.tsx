import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { WorkoutPlanProvider } from "./contexts/WorkoutPlanContext";

createRoot(document.getElementById("root")!).render(
  <WorkoutPlanProvider>
    <App />
  </WorkoutPlanProvider>
);
