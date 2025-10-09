import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Home, LogIn } from "lucide-react";
import Background from "@/components/common/background";
import { Meteors } from "@/components/ui/meteors";

export default function NotFoundPage() {
  return (
    <Background>
      <div className="relative flex h-screen w-screen items-center justify-center px-4">
        <Card
          role="group"
          aria-labelledby="not-found-title"
          className="relative w-full max-w-2xl overflow-hidden border-foreground/10 shadow-xl"
        >
          {/* Meteors inside the Card only */}
          <Meteors number={24} className="z-10 opacity-60" />
          <div className="flex flex-col">
            <CardHeader className="p-10 pb-4">
              <CardTitle
                id="not-found-title"
                className="text-4xl md:text-5xl font-extrabold tracking-tight"
              >
                Page not found
              </CardTitle>
              <CardDescription className="mt-2 text-base md:text-lg">
                Sorry, the route you're trying to visit doesn't exist or has
                changed.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-10 pt-2 text-muted-foreground">
              <p>
                You can go back to the home page or sign in to continue. If you
                think this is an error, share the URL with the team to review
                it.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      asChild
                      className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:opacity-95"
                    >
                      <Link to="/" aria-label="Go to home">
                        <Home className="size-4" />
                        Go home
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Go to the home page</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="lg" asChild>
                      <Link to="/login" aria-label="Go to sign in">
                        <LogIn className="size-4" />
                        Sign in
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sign in with your account</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>

            <CardFooter className="p-10 py-0">
              <small className="text-xs text-muted-foreground">
                Code: 404 • If the problem persists, contact support.
              </small>
            </CardFooter>
          </div>
        </Card>
      </div>
    </Background>
  );
}
