import { Link } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../auth/AuthContext";
import StudentArea from "../components/student/StudentArea";
import { BackendGate } from "../components/panels/ui";
import { ChildBoy, ChildGirl } from "../components/characters";
import "./Course.css";
import "./Auth.css";

export default function StudentHome() {
  const { session, backend } = useAuth();
  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: "Mi área de estudiante" }]} />
      <header className="page-header">
        <p className="page-header__eyebrow">Área del estudiante</p>
        <h1>¡Hola{session ? `, ${session.displayName}` : ""}!</h1>
        <p className="page-header__desc">
          {backend
            ? "Aquí encuentras tu progreso, tus lecciones, actividades, tareas, resultados, coronas, recursos, fotos y juegos."
            : "Tu área de estudiante necesita el servidor para mostrar tu progreso, tareas, coronas y juegos."}
        </p>
      </header>
      {backend ? <StudentArea /> : <BackendGate what="El área del estudiante">{null}</BackendGate>}
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
