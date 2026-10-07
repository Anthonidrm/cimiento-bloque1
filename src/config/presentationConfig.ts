// Configuración del uso de la presentación (15 % de la preparación).
// El uso NO se otorga por abrir un enlace: se mide dentro de la aplicación, por diapositiva
// proyectada y tiempo con la diapositiva en pantalla.
export const PRESENTATION_CONFIG = {
  slideCount: 9, // diapositivas por presentación (public/presentaciones/semana-N/slide-K.jpg)
  minSecondsPerSlide: 5, // segundos visibles para dar una diapositiva por usada
};

export const slideUrl = (week: number, slide: number) => `/presentaciones/semana-${week}/slide-${slide}.jpg`;
