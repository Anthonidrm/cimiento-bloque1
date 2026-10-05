import { Navigate, Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ErrorBoundary from "./ErrorBoundary";
import { useAuth } from "../auth/AuthContext";
import { layoutRedirect } from "../auth/landing";

export default function Layout() {
  const { session } = useAuth();
  const { pathname } = useLocation();

  // El sistema es privado: sin sesión, cualquier ruta (salvo las públicas) lleva primero al login.
  const redirect = layoutRedirect(session?.role, pathname);
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
