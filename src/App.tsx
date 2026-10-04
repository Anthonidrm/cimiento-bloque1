import { Route, Routes, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Resources from "./pages/Resources";
import About from "./pages/About";
import TeacherArea from "./pages/TeacherArea";
import Progress from "./pages/Progress";
import AnnualPlan from "./pages/AnnualPlan";
import WeekDetail from "./pages/WeekDetail";
import WeekExam from "./pages/WeekExam";
import ExamReview from "./pages/ExamReview";
import GuidePrep from "./pages/GuidePrep";
import Login from "./pages/Login";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import StudentHome from "./pages/StudentHome";
import RequireRole from "./auth/RequireRole";
import { STAFF_ROLES } from "./auth/types";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        {/* CIMIENTO tiene una única estructura curricular: el Plan Anual
            (52 semanas / 12 módulos). La antigua página "/curso" que
            presentaba las 12 lecciones como un programa aparte queda
            retirada de la experiencia — se redirige al Plan Anual para
            no romper enlaces guardados, pero ya no se renderiza como
            una segunda malla curricular. */}
        <Route path="curso" element={<Navigate to="/plan-anual" replace />} />
        <Route path="curso/:slug" element={<Navigate to="/plan-anual" replace />} />

        <Route path="recursos" element={<Resources />} />
        <Route path="sobre-cimiento" element={<About />} />
        <Route path="plan-anual" element={<AnnualPlan />} />
        <Route path="plan-anual/:weekSlug" element={<WeekDetail />} />

        <Route path="login" element={<Login />} />

        {/* Áreas con rol: maestro (guía, examen, progreso), administración, estudiante. */}
        <Route path="cuenta" element={<RequireRole><Account /></RequireRole>} />
        <Route path="maestros" element={<RequireRole roles={STAFF_ROLES}><TeacherArea /></RequireRole>} />
        <Route path="mi-progreso" element={<RequireRole roles={STAFF_ROLES}><Progress /></RequireRole>} />
        <Route path="plan-anual/:weekSlug/guia" element={<RequireRole roles={STAFF_ROLES}><GuidePrep /></RequireRole>} />
        <Route path="plan-anual/:weekSlug/examen" element={<RequireRole roles={STAFF_ROLES}><WeekExam /></RequireRole>} />
        <Route path="plan-anual/:weekSlug/revision" element={<RequireRole roles={STAFF_ROLES}><ExamReview /></RequireRole>} />
        <Route path="administracion" element={<RequireRole roles={["ADMINISTRADOR", "PASTOR"]}><Admin /></RequireRole>} />
        <Route path="estudiante" element={<RequireRole><StudentHome /></RequireRole>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
