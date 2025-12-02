import { Link, useLocation } from "react-router-dom";
import { Home, MessageSquare, Dumbbell, User } from "lucide-react";
import { motion } from "framer-motion";
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
    <nav 
      className="fixed bottom-4 left-4 right-4 z-50 flex justify-center"
      style={{ paddingBottom: 'max(0rem, env(safe-area-inset-bottom))' }}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-strong rounded-[2rem] shadow-floating px-4 max-w-md w-full"
      >
        <div className="flex items-center justify-around h-20">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className="relative flex flex-col items-center justify-center flex-1 h-full"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  className={cn(
                    "flex flex-col items-center gap-1",
                    "transition-all duration-200"
                  )}
                >
                  <motion.div
                    animate={{
                      scale: isActive ? [1, 1.2, 1] : 1,
                    }}
                    transition={{
                      duration: 0.3,
                      ease: "easeOut"
                    }}
                    className={cn(
                      "p-2.5 rounded-2xl",
                      isActive && "gradient-primary shadow-glow-md"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-6 h-6 transition-colors",
                        isActive ? "text-white" : "text-muted-foreground"
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </motion.div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold transition-colors tracking-wide",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {tab.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </nav>
  );
};

export default MobileTabBar;
