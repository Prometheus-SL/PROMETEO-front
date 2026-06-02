import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

type WidgetErrorBoundaryProps = {
  children: ReactNode;
  /** Nombre del widget, para mostrarlo en el fallback. */
  name?: string;
};

type WidgetErrorBoundaryState = {
  error: Error | null;
};

/**
 * Aísla el fallo de un widget a su propia celda del dashboard: si un módulo lanza al
 * renderizar, solo se rompe ese widget (no toda la página). Ofrece "Reintentar".
 * El fallback usa tokens de tema y llena la celda sin desbordar (válido en celdas 1x1).
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  override state: WidgetErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[WidgetErrorBoundary] El widget "${this.props.name ?? "?"}" falló al renderizar:`,
      error,
      info.componentStack,
    );
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  override render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-center"
        title={this.state.error.message}
      >
        <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-300" />
        <p className="line-clamp-2 text-xs font-medium text-foreground">
          {this.props.name ?? "Widget"} no se pudo cargar
        </p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Reintentar
        </button>
      </div>
    );
  }
}
