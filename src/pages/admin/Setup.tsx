import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dumbbell, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { syncWgerExercises } from "@/lib/wgerSync";

const Setup = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    count: number;
    error?: string;
  } | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    const result = await syncWgerExercises();
    
    setSyncResult(result);
    setIsSyncing(false);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto pt-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Admin Setup</h1>
          <p className="text-muted-foreground">
            Sync exercise data from WGER Exercise Database
          </p>
        </div>

        {/* Sync Card */}
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">WGER Exercise Library</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Import exercise data including names, descriptions, equipment, muscles, and images from the WGER database.
              </p>
            </div>

            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full h-12 rounded-xl text-base font-medium"
              size="lg"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Syncing Exercises...
                </>
              ) : (
                <>
                  <Dumbbell className="w-5 h-5 mr-2" />
                  Sync WGER Exercises
                </>
              )}
            </Button>

            {/* Result Messages */}
            {syncResult && (
              <div className="mt-6">
                {syncResult.success ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-500">Sync Successful!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Successfully synced {syncResult.count} exercises from WGER database.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive">Sync Failed</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {syncResult.error || 'An unknown error occurred during sync.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-6 mt-6 bg-muted/50">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            About WGER Integration
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The WGER Exercise Database provides comprehensive exercise data including exercise names, 
            descriptions, muscle groups, equipment requirements, and demonstration images. This data 
            powers the exercise matching system for workout plans.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Setup;
