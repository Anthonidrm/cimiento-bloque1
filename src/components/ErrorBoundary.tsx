import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Visible en la consola del navegador para diagnóstico rápido.
    console.error("CIMIENTO — error de renderizado:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "0 auto" }}>
          <h1 style={{ color: "#7a281f" }}>Ocurrió un error al mostrar esta página</h1>
          <p>
            Esto no debería pasar. Por favor recarga la página. Si el
            problema continúa, abre la consola del navegador (F12) y
            comparte el mensaje de error que aparece ahí.
          </p>
          <pre style={{ background: "#fdf3f2", padding: 16, borderRadius: 8, overflow: "auto", fontSize: 13 }}>
            {this.state.error.message}
          </pre>
          <a href="/" style={{ color: "#12304D", fontWeight: 600 }}>
            Volver al inicio
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
