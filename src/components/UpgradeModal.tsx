import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Crown } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

const UpgradeModal = ({ isOpen, onClose, title, description }: UpgradeModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/10">
        <DialogHeader>
          <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow-md">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">{title}</DialogTitle>
          <DialogDescription className="text-center pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-3">
          <Button
            className="w-full h-12 rounded-xl gradient-energy shadow-glow-md font-bold"
            disabled
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Pro (Coming Soon)
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl"
            onClick={onClose}
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
