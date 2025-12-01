import { MessageSquare, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface EditPlanBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onEditWithAI: () => void;
  onEditManually: () => void;
}

const EditPlanBottomSheet = ({
  isOpen,
  onClose,
  onEditWithAI,
  onEditManually,
}: EditPlanBottomSheetProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-[24px] border-t border-border px-6 pb-8"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-semibold text-center">
            Edit Workout Plan
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-3">
          <Button
            onClick={onEditWithAI}
            className="w-full h-14 rounded-xl flex items-center justify-start gap-4 text-base font-medium bg-primary/10 hover:bg-primary/20 text-primary"
            variant="ghost"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">Edit with AI Coach</p>
              <p className="text-xs text-muted-foreground font-normal">
                Chat with AI to modify your plan
              </p>
            </div>
          </Button>

          <Button
            onClick={onEditManually}
            className="w-full h-14 rounded-xl flex items-center justify-start gap-4 text-base font-medium bg-muted/50 hover:bg-muted text-foreground"
            variant="ghost"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Pencil className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">Edit Manually</p>
              <p className="text-xs text-muted-foreground font-normal">
                Directly modify exercises and details
              </p>
            </div>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditPlanBottomSheet;
