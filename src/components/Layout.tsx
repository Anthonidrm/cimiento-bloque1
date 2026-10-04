import { Navigate, Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ErrorBoundary from "./ErrorBoundary";
import { useAuth } from "../auth/AuthContext";

/** Rutas a las que puede entrar un estudiante: solo su área, su cuenta y el login. */
const STUDENT_ALLOWED = ["/estudiante", "/cuenta", "/login"];

export default function Layout() {
  const { session } = useAuth();
  const { pathname } = useLocation();

  if (session?.role === "ESTUDIANTE" && !STUDENT_ALLOWED.includes(pathname)) {
    return <Navigate to="/estudiante" replace />;
  }

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
