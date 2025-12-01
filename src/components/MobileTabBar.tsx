import { Link, useLocation } from "react-router-dom";
import { Home, MessageSquare, Dumbbell, User } from "lucide-react";
import { cn } from "@/lib/utils";

const MobileTabBar = () => {
  const location = useLocation();

  const tabs = [
    { path: "/home", icon: Home, label: "Home" },
    { path: "/chat", icon: MessageSquare, label: "Chat" },
    { path: "/workouts", icon: Dumbbell, label: "Workouts" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all duration-200",
                isActive && "scale-105"
              )}
            >
              <Icon
                className={cn(
                  "w-6 h-6 mb-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileTabBar;