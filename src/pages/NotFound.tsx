import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 safe-area-top safe-area-bottom">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <Link to="/home">
          <Button size="lg" className="w-full h-14 text-base rounded-2xl">
            <Home className="w-5 h-5 mr-2" />
            Go to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;