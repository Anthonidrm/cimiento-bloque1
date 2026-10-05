import { Navigate, Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ErrorBoundary from "./ErrorBoundary";
import { useAuth } from "../auth/AuthContext";
import { layoutRedirect } from "../auth/landing";

export default function Layout() {
  const { session, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) return <p className="container page" role="status">Cargando…</p>;

  // El sistema es privado: sin sesión, cualquier ruta (salvo las públicas) lleva primero al login.
  const redirect = layoutRedirect(session?.role, pathname, session?.mustChangePassword);
  if (redirect) return <Navigate to={redirect} replace />;

  return (
    <div className="app-shell">
      <Header />
      <main>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
