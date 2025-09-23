import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, User, BarChart3 } from "lucide-react";
import CreateRequestForm from "@/components/CreateRequestForm";

const CreateRequest = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">Please sign in to create a connection request.</p>
          <Button asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-8 px-4">
      {/* Header with navigation */}
      <header className="container mx-auto flex justify-between items-center mb-8">
        <Button variant="ghost" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex gap-4">
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </Link>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto">
        <CreateRequestForm />
      </div>
    </main>
  );
};

export default CreateRequest;