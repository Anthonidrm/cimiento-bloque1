import { Link } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../auth/AuthContext";
import { ChildBoy, ChildGirl } from "../components/characters";
import "./Course.css";
import "./Auth.css";

export default function StudentHome() {
  const { session } = useAuth();
  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: "Mi área de estudiante" }]} />
      <header className="page-header">
        <p className="page-header__eyebrow">Área del estudiante</p>
        <h1>¡Hola{session ? `, ${session.displayName}` : ""}!</h1>
        <p className="page-header__desc">
          Tu área de estudiante está en preparación. Muy pronto aquí encontrarás tus actividades, tu
          progreso y tus juegos de cada lección.
        </p>
      </header>
      <div className="student-chars" aria-hidden="true">
        <ChildGirl size={190} pose="cheer" />
        <ChildBoy size={190} pose="wave" />
      </div>
      <p>
        <Link to="/cuenta" className="auth-link">Cambiar mi contraseña</Link>
      </p>
    </div>
  );
}
