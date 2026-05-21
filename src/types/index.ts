export type Scale = "51" | "60" | "65";          // conservado para compatibilidad
export type RoundingMode = "escalaNotas" | "standard";

// Configuración dinámica de escala
export interface ScaleConfig {
  maxScore:           string;   // puntaje máximo (ej. "100", "40", "25")
  requirementPercent: string;   // exigencia en % (ej. "51", "60", "65")
  minGrade:           string;   // nota mínima (ej. "1.0")
  passingGrade:       string;   // nota de aprobación (ej. "4.0")
  maxGrade:           string;   // nota máxima (ej. "7.0")
  roundingMode:       RoundingMode;
}

export const DEFAULT_SCALE_CONFIG: ScaleConfig = {
  maxScore:           "100",
  requirementPercent: "51",
  minGrade:           "1.0",
  passingGrade:       "4.0",
  maxGrade:           "7.0",
  roundingMode:       "escalaNotas",
};

export interface AppConfig {
  subject:      string;
  professor:    string;
  createdBy:    string;
  createdByRole:string;
}

export interface EvaluationData {
  studentName:   string;
  testNumber:    string;
  totalScore:    string;
  scaleConfig:   ScaleConfig;   // reemplaza el antiguo 'scale'
  finalGrade:    string;
  isManualGrade: boolean;
  feedback:      string;
  date:          string;
}

// ── Interrogación oral ───────────────────────────────────────────────────────

export const ORAL_CRITERIA_LABELS: readonly string[] = [
  'Claridad y precisión conceptual',
  'Dominio de la materia',
  'Capacidad argumentativa',
  'Coherencia en el desarrollo',
  'Uso de terminología jurídica',
  'Fundamentación teórica',
  'Respuesta a preguntas de seguimiento',
  'Capacidad de síntesis',
  'Orden y metodología expositiva',
  'Relaciona el tema con el contexto normativo',
] as const;

export interface OralCriteria {
  label:   string;
  checked: boolean;
}

export interface OralQuestion {
  id:          string;
  topic:       string;
  maxScore:    string;
  score:       string;
  observation: string;
  criteria:    OralCriteria[];
}

export interface OralMilestone {
  id:          string;
  elapsed:     string;   // "MM:SS" o "HH:MM:SS"
  description: string;
}

export interface OralExamData {
  studentName:         string;
  date:                string;
  questions:           OralQuestion[];
  totalScore:          string;    // puntaje efectivo al momento de exportar
  totalMaxScore:       string;    // máximo efectivo al momento de exportar
  useSumFromQuestions: boolean;
  scaleConfig:         ScaleConfig;
  finalGrade:          string;
  isManualGrade:       boolean;
  generalObservation:  string;
  milestones:          OralMilestone[];
  duration:            string;    // tiempo transcurrido al exportar
}
