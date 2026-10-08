// Colores de la remisión. El PDF no lee variables CSS, por eso viven aquí,
// alineados con tokens.css (marca #F89A16, neutros).

export const pdfTheme = {
  ink: "#111111",
  inkMuted: "#555555",
  line: "#CCCCCC",
  brand: "#F89A16",
  surface: "#F5F5F5",
} as const;

/** Margen carta de 12 mm expresado en puntos (1 mm = 2.8346 pt). */
export const MM = 2.8346;
