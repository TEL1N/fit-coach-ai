import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { WorkoutPlanProvider } from "./contexts/WorkoutPlanContext";
import { ChatProvider } from "./contexts/ChatContext";

createRoot(document.getElementById("root")!).render(
  <WorkoutPlanProvider>
    <ChatProvider>
      <App />
    </ChatProvider>
  </WorkoutPlanProvider>
);
