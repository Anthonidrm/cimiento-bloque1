import { useState } from "react";
import { NavLink } from "react-router-dom";
import logo from "../assets/logo-cimiento.png";
import churchBadge from "../assets/logo-ieoh-badge.png";
import { brand } from "../data/brand";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABELS, type Role } from "../auth/types";
import "./Header.css";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

/** Navegación según el rol. Un visitante sin sesión solo ve las páginas públicas. */
function navFor(role: Role | undefined): NavItem[] {
  if (!role) return [{ to: "/sobre-cimiento", label: "Sobre CIMIENTO" }];
  if (role === "ESTUDIANTE") return [{ to: "/estudiante", label: "Mi área" }];
  const items: NavItem[] = [
    { to: "/", label: "Inicio", end: true },
    { to: "/plan-anual", label: "Plan Anual" },
    { to: "/recursos", label: "Recursos" },
    { to: "/maestros", label: "Maestros" },
    { to: "/mi-progreso", label: "Mi progreso" },
  ];
  if (role === "PASTOR" || role === "ADMINISTRADOR") items.push({ to: "/pastor", label: "Pastor" });
  if (role === "ADMINISTRADOR") items.push({ to: "/administracion", label: "Administración" });
  items.push({ to: "/sobre-cimiento", label: "Sobre CIMIENTO" });
  return items;
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const { session, logout } = useAuth();
  const navItems = navFor(session?.role);

  return (
    <header className="site-header">
      <div className="container site-header__bar">
        <NavLink to="/" className="site-header__brand" onClick={() => setOpen(false)}>
          <img src={logo} alt={`${brand.name} — logo oficial`} className="site-header__logo" />
          <span className="site-header__brandtext">
            <strong>{brand.name}</strong>
            <small>{brand.category}</small>
          </span>
          <img
            src={churchBadge}
            alt="IEOH — Iglesia Evangélica de Oración"
            className="site-header__church-badge"
          />
        </NavLink>

        <button
          className="site-header__toggle"
          aria-expanded={open}
          aria-label="Abrir menú de navegación"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`site-header__nav ${open ? "is-open" : ""}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                "site-header__link" + (isActive ? " is-active" : "")
              }
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <span className="site-header__auth">
            {session ? (
              <>
                <NavLink to="/cuenta" className="site-header__user" onClick={() => setOpen(false)}>
                  {session.displayName}
                  <small>{ROLE_LABELS[session.role]}</small>
                </NavLink>
                <button
                  type="button"
                  className="site-header__logout"
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                >
                  Salir
                </button>
              </>
            ) : (
              <NavLink to="/login" className="site-header__login" onClick={() => setOpen(false)}>
                Iniciar sesión
              </NavLink>
            )}
          </span>
        </nav>
      </div>
    </header>
  );
}
