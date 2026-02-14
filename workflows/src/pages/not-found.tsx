import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-4 shadow-xl border-border">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 text-destructive font-bold items-center justify-center">
            <AlertCircle className="h-8 w-8" />
            <h1 className="text-2xl">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-muted-foreground text-center mb-6">
            The page you requested could not be found. It may have been moved or deleted.
          </p>

          <div className="flex justify-center">
            <Link href="/">
              <Button>Return Home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
