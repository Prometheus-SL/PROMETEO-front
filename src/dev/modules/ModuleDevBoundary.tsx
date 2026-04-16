import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

type ModuleDevBoundaryProps = {
  children: ReactNode;
  title?: string;
};

type ModuleDevBoundaryState = {
  error: Error | null;
};

export class ModuleDevBoundary extends Component<
  ModuleDevBoundaryProps,
  ModuleDevBoundaryState
> {
  override state: ModuleDevBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dev module render failed:", error, errorInfo);
  }

  override render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="flex h-full min-h-[160px] w-full flex-col items-center justify-center rounded-[24px] border border-rose-500/20 bg-rose-500/8 px-5 py-6 text-center">
        <div className="mb-3 rounded-full border border-rose-500/20 bg-background/80 p-3 text-rose-600 dark:text-rose-300">
          <AlertTriangle className="size-5" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          {this.props.title ?? "Module preview failed to render"}
        </p>
        <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">
          {this.state.error.message}
        </p>
      </div>
    );
  }
}
