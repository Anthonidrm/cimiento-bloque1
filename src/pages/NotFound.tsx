import { Link } from "react-router-dom";
import "./Course.css";

export default function NotFound() {
  return (
    <div className="container page">
      <header className="page-header">
        <h1>Página no encontrada</h1>
        <p className="page-header__desc">
          <Link to="/">Volver al inicio</Link>
        </p>
      </header>
    </div>
  );
}
