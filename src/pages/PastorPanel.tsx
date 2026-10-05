import Breadcrumbs from "../components/Breadcrumbs";
import AreaSections, { type AreaSection } from "../components/AreaSections";
import { useAuth } from "../auth/AuthContext";
import "./Course.css";

const BACKEND = "Necesita compartir información entre usuarios (backend). Ver docs/BACKEND_PROPUESTA.md.";

const SECTIONS: AreaSection[] = [
  { title: "Lecciones", description: "Plan Anual de 52 semanas y contenido de cada lección.", status: "available", to: "/plan-anual" },
  { title: "Recursos", description: "Presentación, hoja de trabajo, hoja para colorear, tarjeta de versículo y guía de cada lección.", status: "partial", to: "/recursos", note: "Consulta disponible. Agregar o reemplazar recursos requiere almacenamiento en backend." },
  { title: "Mi preparación", description: "Guía, examen y presentación de las lecciones, con tu porcentaje de preparación.", status: "available", to: "/maestros" },
  { title: "Asignar / cambiar maestro", description: "Asignar un maestro a cada lección, con fecha y hora y control de atraso.", status: "backend", note: BACKEND },
  { title: "Progreso de maestros", description: "Preparación, examen, presentación y última actividad de cada maestro.", status: "backend", note: "Hoy el progreso de cada maestro se guarda solo en su navegador, por eso no puede verse aquí." },
  { title: "Progreso de estudiantes", description: "Asistencia, asignaciones, actividades, examen, participación y coronas.", status: "backend", note: BACKEND },
  { title: "Asistencia y reportes de clase", description: "Pase de lista y reporte posterior a cada clase.", status: "backend", note: BACKEND },
  { title: "Actividades y asignaciones", description: "Actividades obligatorias, actividades de integración y entregas de los estudiantes.", status: "backend", note: BACKEND },
];

export default function PastorPanel() {
  const { session } = useAuth();
  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: "Panel del Pastor" }]} />
      <header className="page-header">
        <p className="page-header__eyebrow">Panel del Pastor</p>
        <h1>Hola, {session?.displayName}</h1>
        <p className="page-header__desc">
          Desde aquí el Pastor ve las lecciones, asigna maestros y sigue el progreso de maestros y estudiantes.
          El estado de cada sección indica con claridad qué funciona hoy y qué se activa cuando exista el backend.
        </p>
      </header>
      <AreaSections sections={SECTIONS} />
    </div>
  );
}
