import { motion } from "framer-motion";

const TypingIndicator = () => {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-full gradient-energy flex items-center justify-center flex-shrink-0 shadow-glow-sm">
        <span className="text-white text-xs font-bold">AI</span>
      </div>
      <div className="glass-card rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-2 h-2 bg-primary/70 rounded-full"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 bg-primary/70 rounded-full"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          />
          <motion.div
            className="w-2 h-2 bg-primary/70 rounded-full"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;

