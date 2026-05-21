import { useState, useEffect, useRef, useId } from 'react';
import { calculateDynamicGrade, scaleInfoText } from '../utils/gradeCalculator';
import { generateOralPDF } from '../utils/oralPdfExport';
import OralTimer from './OralTimer';
import OralQuestions, { makeQuestion } from './OralQuestions';
import type {
  AppConfig, OralQuestion, OralMilestone, OralExamData, ScaleConfig,
} from '../types';
import { DEFAULT_SCALE_CONFIG } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

function formatSeconds(s: number): string {
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function makeInitialQuestions(): OralQuestion[] {
  return [0, 1, 2].map(() => makeQuestion());
}

function fmtNum(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(1);
}

const REQUIREMENT_PRESETS = ['51', '60', '65'] as const;
const STORAGE_KEY = 'oral_draft_benfeld';

// ── Props ─────────────────────────────────────────────────────────────────────

interface OralExamModuleProps {
  config:          AppConfig;
  subject:         string;
  onSubjectChange: (v: string) => void;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function OralExamModule({ config, subject, onSubjectChange }: OralExamModuleProps) {
  const uid = useId();

  // ── Estado del formulario ──────────────────────────────────────────────────
  const [studentName,          setStudentName]          = useState('');
  const [date,                 setDate]                 = useState(getTodayISO);
  const [questions,            setQuestions]            = useState<OralQuestion[]>(makeInitialQuestions);
  const [scaleConfig,          setScaleConfig]          = useState<ScaleConfig>(DEFAULT_SCALE_CONFIG);
  const [finalGrade,           setFinalGrade]           = useState('');
  const [isManual,             setIsManual]             = useState(false);
  const [useSumFromQuestions,  setUseSumFromQuestions]  = useState(true);
  const [manualTotalScore,     setManualTotalScore]      = useState('');
  const [generalObservation,   setGeneralObservation]   = useState('');
  const [feedbackDraft,        setFeedbackDraft]        = useState('');
  const [milestones,           setMilestones]           = useState<OralMilestone[]>([]);
  const [warnings,             setWarnings]             = useState<string[]>([]);
  const [savedMsg,             setSavedMsg]             = useState(false);
  const [hasDraft,             setHasDraft]             = useState<boolean>(
    () => Boolean(localStorage.getItem(STORAGE_KEY)),
  );
  const [showAdvScale,         setShowAdvScale]         = useState(false);

  // ── Cronómetro (estado gestionado aquí, UI delegada a OralTimer) ───────────
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning]);

  // ── Valores derivados ──────────────────────────────────────────────────────
  const sumScore           = questions.reduce((s, q) => s + (parseFloat(q.score)    || 0), 0);
  const totalMaxFromQs     = questions.reduce((s, q) => s + (parseFloat(q.maxScore) || 0), 0);
  const timerDisplay       = formatSeconds(timerSeconds);

  // ── Auto-cálculo de nota ───────────────────────────────────────────────────
  useEffect(() => {
    if (isManual) return;

    const ss  = questions.reduce((s, q) => s + (parseFloat(q.score)    || 0), 0);
    const tmq = questions.reduce((s, q) => s + (parseFloat(q.maxScore) || 0), 0);

    const effScore = useSumFromQuestions ? ss : parseFloat(manualTotalScore);
    const effMax   = useSumFromQuestions
      ? tmq
      : (parseFloat(scaleConfig.maxScore) || 100);

    if (useSumFromQuestions && !questions.some(q => q.score !== '')) {
      setFinalGrade('');
      return;
    }
    if (!useSumFromQuestions && manualTotalScore === '') {
      setFinalGrade('');
      return;
    }
    if (isNaN(effScore) || effMax <= 0) {
      setFinalGrade('');
      return;
    }

    const result = calculateDynamicGrade({
      score:              effScore,
      maxScore:           effMax,
      requirementPercent: parseFloat(scaleConfig.requirementPercent) || 51,
      minGrade:           parseFloat(scaleConfig.minGrade)           || 1.0,
      passingGrade:       parseFloat(scaleConfig.passingGrade)       || 4.0,
      maxGrade:           parseFloat(scaleConfig.maxGrade)           || 7.0,
      roundingMode:       scaleConfig.roundingMode,
    });
    setFinalGrade(result);
  }, [questions, manualTotalScore, useSumFromQuestions, scaleConfig, isManual]);

  // ── Handlers del cronómetro ────────────────────────────────────────────────
  function handleTimerToggle() {
    setTimerRunning(r => !r);
  }
  function handleTimerReset() {
    setTimerRunning(false);
    setTimerSeconds(0);
  }
  function handleAddMilestone(desc: string) {
    setMilestones(prev => [...prev, {
      id:          `m_${Date.now()}`,
      elapsed:     timerDisplay,
      description: desc || `Hito ${prev.length + 1}`,
    }]);
  }
  function handleRemoveMilestone(id: string) {
    setMilestones(prev => prev.filter(m => m.id !== id));
  }
  function handleUpdateMilestoneDesc(id: string, desc: string) {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, description: desc } : m));
  }

  // ── Escala ────────────────────────────────────────────────────────────────
  function updateScale(partial: Partial<ScaleConfig>) {
    setScaleConfig(prev => ({ ...prev, ...partial }));
    setIsManual(false);
  }
  const activePreset = REQUIREMENT_PRESETS.includes(
    scaleConfig.requirementPercent as typeof REQUIREMENT_PRESETS[number],
  ) ? scaleConfig.requirementPercent : null;

  const effMaxForScale = useSumFromQuestions
    ? totalMaxFromQs
    : (parseFloat(scaleConfig.maxScore) || 100);
  const reqNum = parseFloat(scaleConfig.requirementPercent);
  const pgNum  = parseFloat(scaleConfig.passingGrade) || 4.0;
  const scaleInfo = (!isNaN(reqNum) && effMaxForScale > 0)
    ? scaleInfoText(reqNum, effMaxForScale, pgNum)
    : '';

  // ── Nota manual ───────────────────────────────────────────────────────────
  function handleGradeManualEdit(v: string) {
    setFinalGrade(v);
    setIsManual(true);
  }
  function handleRestoreAutoGrade() {
    setIsManual(false);
  }

  // ── Borrador de feedback ──────────────────────────────────────────────────
  function handleGenerateDraft() {
    const ss  = questions.reduce((s, q) => s + (parseFloat(q.score)    || 0), 0);
    const tmq = questions.reduce((s, q) => s + (parseFloat(q.maxScore) || 0), 0);

    const effScore = useSumFromQuestions ? fmtNum(ss) : manualTotalScore;
    const effMax   = useSumFromQuestions ? fmtNum(tmq) : (scaleConfig.maxScore || '—');

    const lines: string[] = [];
    lines.push('RETROALIMENTACIÓN — INTERROGACIÓN ORAL');
    lines.push('');
    lines.push(`Asignatura: ${config.subject || '—'}`);
    lines.push(`Profesor titular: ${config.professor}`);
    lines.push(`Estudiante: ${studentName.trim() || '—'}`);
    lines.push(`Fecha: ${formatDateDisplay(date)}`);
    if (timerDisplay && timerDisplay !== '00:00') {
      lines.push(`Duración de la interrogación: ${timerDisplay}`);
    }
    lines.push('');
    lines.push('─────────────────────────────────────');
    lines.push('');
    lines.push('PREGUNTAS EVALUADAS');
    lines.push('');

    questions.forEach((q, i) => {
      const topicStr = q.topic.trim() || '(sin título)';
      const scoreStr = q.score !== '' ? q.score : '—';
      lines.push(`Pregunta ${i + 1} — ${topicStr} (${scoreStr} / ${q.maxScore} pts.)`);
      if (q.observation.trim()) {
        lines.push(q.observation.trim());
      }
      const checkedCriteria = q.criteria.filter(c => c.checked).map(c => c.label);
      if (checkedCriteria.length > 0) {
        lines.push(`Criterios logrados: ${checkedCriteria.join(', ')}.`);
      }
      lines.push('');
    });

    lines.push('─────────────────────────────────────');
    lines.push('');
    lines.push('RESULTADOS');
    lines.push(`Puntaje total: ${effScore || '—'} / ${effMax} pts.`);
    lines.push(`Exigencia aplicada: ${scaleConfig.requirementPercent}%`);
    lines.push(`Nota final: ${finalGrade ? finalGrade.replace('.', ',') : '—'}`);
    lines.push('');
    lines.push('─────────────────────────────────────');
    lines.push('');
    lines.push('OBSERVACIÓN GENERAL');
    lines.push(generalObservation.trim() || '(Pendiente de completar)');

    setFeedbackDraft(lines.join('\n'));
  }

  // ── Acciones principales ──────────────────────────────────────────────────
  function buildExamData(): OralExamData {
    const ss  = questions.reduce((s, q) => s + (parseFloat(q.score)    || 0), 0);
    const tmq = questions.reduce((s, q) => s + (parseFloat(q.maxScore) || 0), 0);
    return {
      studentName:         studentName.trim(),
      date,
      questions,
      totalScore:          useSumFromQuestions ? fmtNum(ss) : manualTotalScore,
      totalMaxScore:       useSumFromQuestions ? fmtNum(tmq) : scaleConfig.maxScore,
      useSumFromQuestions,
      scaleConfig,
      finalGrade:          finalGrade || '—',
      isManualGrade:       isManual,
      generalObservation:  generalObservation.trim(),
      milestones,
      duration:            timerDisplay,
    };
  }

  function handleDownloadPDF() {
    const warns: string[] = [];
    if (!studentName.trim()) warns.push('Falta el nombre del estudiante.');
    if (!useSumFromQuestions && !manualTotalScore.trim()) {
      warns.push('Falta el puntaje total (modo manual).');
    }
    if (warns.length > 0) { setWarnings(warns); return; }
    setWarnings([]);
    generateOralPDF(buildExamData(), config);
  }

  function handleSaveDraft() {
    const draft = {
      studentName, date, questions, scaleConfig,
      finalGrade, isManual, useSumFromQuestions, manualTotalScore,
      generalObservation, feedbackDraft, milestones,
      subject,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setHasDraft(true);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2200);
    } catch { /* cuota excedida o modo privado */ }
  }

  function handleLoadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = JSON.parse(raw) as Record<string, any>;
      setStudentName(typeof d.studentName === 'string' ? d.studentName : '');
      setDate(typeof d.date === 'string' ? d.date : getTodayISO());
      setQuestions(Array.isArray(d.questions) && d.questions.length > 0
        ? d.questions as OralQuestion[]
        : makeInitialQuestions());
      if (d.scaleConfig && typeof d.scaleConfig === 'object') setScaleConfig(d.scaleConfig as ScaleConfig);
      setFinalGrade(typeof d.finalGrade === 'string' ? d.finalGrade : '');
      setIsManual(Boolean(d.isManual));
      setUseSumFromQuestions(d.useSumFromQuestions !== false);
      setManualTotalScore(typeof d.manualTotalScore === 'string' ? d.manualTotalScore : '');
      setGeneralObservation(typeof d.generalObservation === 'string' ? d.generalObservation : '');
      setFeedbackDraft(typeof d.feedbackDraft === 'string' ? d.feedbackDraft : '');
      setMilestones(Array.isArray(d.milestones) ? d.milestones as OralMilestone[] : []);
      if (typeof d.subject === 'string' && d.subject) onSubjectChange(d.subject);
      // El cronómetro se reinicia — la duración guardada es solo informativa
      handleTimerReset();
    } catch { /* datos corruptos */ }
  }

  function handleClear() {
    setStudentName('');
    setDate(getTodayISO());
    setQuestions(makeInitialQuestions());
    setFinalGrade('');
    setIsManual(false);
    setUseSumFromQuestions(true);
    setManualTotalScore('');
    setGeneralObservation('');
    setFeedbackDraft('');
    setMilestones([]);
    setWarnings([]);
    handleTimerReset();
    // Conserva: scaleConfig, subject
  }

  // ── Estilos compartidos ───────────────────────────────────────────────────
  const inputBase =
    'w-full px-3 py-2.5 text-sm text-graphite-800 bg-white border border-graphite-200 rounded-lg ' +
    'focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-500 transition placeholder-graphite-300';
  const compactInput =
    'w-full px-2.5 py-2 text-sm text-graphite-800 bg-white border border-graphite-200 rounded-lg ' +
    'focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-500 transition';

  const gradeStatus = !finalGrade ? 'none'
    : parseFloat(finalGrade) >= 4.0 ? 'approved' : 'failed';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── FILA 1: Datos + Cronómetro ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Datos de la interrogación */}
        <div className="bg-white rounded-2xl shadow-card border border-graphite-100 p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2 pb-4 border-b border-graphite-100">
            <div className="w-7 h-7 rounded-lg bg-academic-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-academic-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-graphite-800">Datos de la interrogación</h2>
              <p className="text-xs text-graphite-400">Ingrese los datos manualmente</p>
            </div>
          </div>

          {/* Asignatura */}
          <div>
            <label htmlFor={`${uid}-subject`}
              className="block text-xs font-semibold text-graphite-600 uppercase tracking-wide mb-1.5">
              Asignatura <span className="text-burgundy-500">*</span>
            </label>
            <input
              id={`${uid}-subject`}
              type="text"
              value={subject}
              onChange={e => onSubjectChange(e.target.value)}
              placeholder="Ej. Filosofía del Derecho…"
              className={inputBase}
              autoComplete="off"
            />
          </div>

          {/* Nombre del estudiante */}
          <div>
            <label htmlFor={`${uid}-name`}
              className="block text-xs font-semibold text-graphite-600 uppercase tracking-wide mb-1.5">
              Nombre del estudiante <span className="text-burgundy-500">*</span>
            </label>
            <input
              id={`${uid}-name`}
              type="text"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              placeholder="Ej. Juan Pérez Soto"
              className={inputBase}
              autoComplete="off"
            />
          </div>

          {/* Fecha */}
          <div>
            <label htmlFor={`${uid}-date`}
              className="block text-xs font-semibold text-graphite-600 uppercase tracking-wide mb-1.5">
              Fecha
            </label>
            <input
              id={`${uid}-date`}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={`${inputBase} cursor-pointer`}
            />
          </div>
        </div>

        {/* Cronómetro */}
        <OralTimer
          display={timerDisplay}
          running={timerRunning}
          milestones={milestones}
          onToggle={handleTimerToggle}
          onReset={handleTimerReset}
          onAddMilestone={handleAddMilestone}
          onRemoveMilestone={handleRemoveMilestone}
          onUpdateMilestoneDesc={handleUpdateMilestoneDesc}
        />
      </div>

      {/* ── FILA 2: Preguntas evaluadas ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card border border-graphite-100 p-6">
        <div className="flex items-center gap-2 pb-4 border-b border-graphite-100 mb-5">
          <div className="w-7 h-7 rounded-lg bg-academic-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-academic-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-graphite-800">Preguntas evaluadas</h2>
            <p className="text-xs text-graphite-400">
              Expanda cada pregunta para registrar criterios y observaciones
            </p>
          </div>
        </div>

        <OralQuestions questions={questions} onChange={setQuestions} />
      </div>

      {/* ── FILA 3: Escala + Nota / Observación general ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Configuración de escala + Nota */}
        <div className="bg-white rounded-2xl shadow-card border border-graphite-100 p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2 pb-4 border-b border-graphite-100">
            <div className="w-7 h-7 rounded-lg bg-academic-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-academic-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-graphite-800">Puntaje y nota</h2>
          </div>

          {/* Modo de puntaje */}
          <div>
            <p className="text-xs font-semibold text-graphite-600 uppercase tracking-wide mb-2">
              Origen del puntaje total
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setUseSumFromQuestions(true); setIsManual(false); }}
                className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition ${
                  useSumFromQuestions
                    ? 'bg-academic-600 border-academic-600 text-white shadow-sm'
                    : 'bg-white border-graphite-200 text-graphite-600 hover:border-academic-300 hover:bg-academic-50'
                }`}
              >
                Suma de preguntas
              </button>
              <button
                type="button"
                onClick={() => { setUseSumFromQuestions(false); setIsManual(false); }}
                className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition ${
                  !useSumFromQuestions
                    ? 'bg-academic-600 border-academic-600 text-white shadow-sm'
                    : 'bg-white border-graphite-200 text-graphite-600 hover:border-academic-300 hover:bg-academic-50'
                }`}
              >
                Puntaje manual
              </button>
            </div>
          </div>

          {/* Resumen de puntaje */}
          {useSumFromQuestions ? (
            <div className="rounded-xl bg-graphite-50 border border-graphite-150 px-4 py-3">
              <p className="text-[11px] font-semibold text-graphite-500 uppercase tracking-wide mb-1">
                Puntaje calculado desde preguntas
              </p>
              <p className="text-2xl font-bold text-graphite-800">
                {fmtNum(sumScore)}
                <span className="text-base font-normal text-graphite-400 ml-1">
                  / {fmtNum(totalMaxFromQs)} pts.
                </span>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${uid}-mscore`}
                  className="block text-[11px] font-semibold text-graphite-500 uppercase tracking-wide mb-1">
                  Puntaje obtenido
                </label>
                <input
                  id={`${uid}-mscore`}
                  type="number"
                  value={manualTotalScore}
                  min={0}
                  step={0.5}
                  onChange={e => { setManualTotalScore(e.target.value); setIsManual(false); }}
                  placeholder="0"
                  className={compactInput}
                />
              </div>
              <div>
                <label htmlFor={`${uid}-mmaxscore`}
                  className="block text-[11px] font-semibold text-graphite-500 uppercase tracking-wide mb-1">
                  Puntaje máximo
                </label>
                <input
                  id={`${uid}-mmaxscore`}
                  type="number"
                  value={scaleConfig.maxScore}
                  min={1}
                  step={1}
                  onChange={e => updateScale({ maxScore: e.target.value })}
                  placeholder="100"
                  className={compactInput}
                />
              </div>
            </div>
          )}

          {/* Escala: exigencia */}
          <div className="rounded-xl border border-graphite-150 bg-graphite-50/40 p-4 flex flex-col gap-3">
            <p className="text-[11px] font-semibold text-graphite-600 uppercase tracking-wide">
              Configuración de escala
            </p>

            <div>
              <label htmlFor={`${uid}-req`}
                className="block text-[11px] font-semibold text-graphite-500 uppercase tracking-wide mb-1">
                Exigencia (%)
              </label>
              <input
                id={`${uid}-req`}
                type="number"
                min={1}
                max={100}
                step={1}
                value={scaleConfig.requirementPercent}
                onChange={e => updateScale({ requirementPercent: e.target.value })}
                placeholder="51"
                className={compactInput}
              />
            </div>

            <div className="flex gap-2">
              {REQUIREMENT_PRESETS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => updateScale({ requirementPercent: p })}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition ${
                    activePreset === p
                      ? 'bg-academic-600 border-academic-600 text-white shadow-sm'
                      : 'bg-white border-graphite-200 text-graphite-600 hover:border-academic-300 hover:bg-academic-50'
                  }`}
                >
                  {p}%
                </button>
              ))}
              <button
                type="button"
                onClick={() => updateScale({ requirementPercent: '' })}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition ${
                  !activePreset
                    ? 'bg-graphite-700 border-graphite-700 text-white shadow-sm'
                    : 'bg-white border-graphite-200 text-graphite-500 hover:border-graphite-400 hover:bg-graphite-50'
                }`}
              >
                Libre
              </button>
            </div>

            {scaleInfo && (
              <p className="text-[11px] text-academic-700 bg-academic-50 border border-academic-100 rounded-lg px-3 py-2 leading-relaxed">
                ℹ️ {scaleInfo}
              </p>
            )}

            {/* Configuración avanzada */}
            <button
              type="button"
              onClick={() => setShowAdvScale(v => !v)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-graphite-500 hover:text-graphite-700 transition self-start"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${showAdvScale ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Configuración avanzada
            </button>

            {showAdvScale && (
              <div className="flex flex-col gap-3 pt-1 border-t border-graphite-150">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'ominGr',  label: 'Nota mín.',  key: 'minGrade'     as const },
                    { id: 'oaprGr',  label: 'Aprobación', key: 'passingGrade' as const },
                    { id: 'omaxGr',  label: 'Nota máx.',  key: 'maxGrade'     as const },
                  ]).map(({ id, label, key }) => (
                    <div key={key}>
                      <label htmlFor={`${uid}-${id}`}
                        className="block text-[11px] font-semibold text-graphite-500 uppercase tracking-wide mb-1">
                        {label}
                      </label>
                      <input
                        id={`${uid}-${id}`}
                        type="number"
                        min={1}
                        max={10}
                        step={0.1}
                        value={scaleConfig[key]}
                        onChange={e => updateScale({ [key]: e.target.value })}
                        className={compactInput}
                      />
                    </div>
                  ))}
                </div>

                {(() => {
                  const mn = parseFloat(scaleConfig.minGrade);
                  const pa = parseFloat(scaleConfig.passingGrade);
                  const mx = parseFloat(scaleConfig.maxGrade);
                  if (!isNaN(mn) && !isNaN(pa) && !isNaN(mx) && !(mn < pa && pa < mx)) {
                    return (
                      <p className="text-[11px] text-amber-700 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Las notas deben cumplir: mín &lt; aprobación &lt; máx.
                      </p>
                    );
                  }
                  return null;
                })()}

                <div>
                  <p className="text-[11px] font-semibold text-graphite-500 uppercase tracking-wide mb-1.5">
                    Redondeo
                  </p>
                  <div className="flex gap-2">
                    {([
                      { v: 'escalaNotas' as const, label: 'escaladenotas.cl' },
                      { v: 'standard'   as const, label: 'Estándar' },
                    ] as const).map(({ v, label }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateScale({ roundingMode: v })}
                        className={`flex-1 py-1.5 rounded-lg border text-[11px] font-medium transition ${
                          scaleConfig.roundingMode === v
                            ? 'bg-academic-600 border-academic-600 text-white'
                            : 'bg-white border-graphite-200 text-graphite-600 hover:border-academic-300 hover:bg-academic-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nota final */}
          <div>
            <label htmlFor={`${uid}-grade`}
              className="block text-xs font-semibold text-graphite-600 uppercase tracking-wide mb-1.5">
              Nota final
            </label>
            <div className="flex gap-2 items-start">
              <div className="relative flex-1">
                <input
                  id={`${uid}-grade`}
                  type="text"
                  value={finalGrade ? finalGrade.replace('.', ',') : ''}
                  onChange={e => handleGradeManualEdit(e.target.value.replace(',', '.'))}
                  placeholder="—"
                  className={`${inputBase} font-semibold text-base pr-20 ${
                    gradeStatus === 'approved'
                      ? 'text-emerald-700 border-emerald-300 focus:border-emerald-400 focus:ring-emerald-300/40 bg-emerald-50/40'
                      : gradeStatus === 'failed'
                      ? 'text-red-700 border-red-300 focus:border-red-400 focus:ring-red-300/40 bg-red-50/40'
                      : ''
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {isManual ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
                      manual
                    </span>
                  ) : finalGrade ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-academic-50 text-academic-600 border border-academic-200">
                      auto
                    </span>
                  ) : null}
                </div>
              </div>
              {isManual && (
                <button
                  type="button"
                  onClick={handleRestoreAutoGrade}
                  title="Restaurar nota automática"
                  className="flex-shrink-0 mt-0.5 px-3 py-2.5 text-xs font-medium text-academic-600 bg-academic-50 border border-academic-200 rounded-lg hover:bg-academic-100 transition"
                >
                  ↺ Auto
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-graphite-400">
              {isManual
                ? 'Nota editada manualmente. Puede restaurar el valor calculado.'
                : finalGrade
                ? `Calculada automáticamente (exigencia ${scaleConfig.requirementPercent}%).`
                : 'Se calculará al ingresar puntajes.'}
            </p>
          </div>
        </div>

        {/* Observación general */}
        <div className="bg-white rounded-2xl shadow-card border border-graphite-100 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-4 border-b border-graphite-100">
            <div className="w-7 h-7 rounded-lg bg-academic-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-academic-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-graphite-800">Observación general</h2>
              <p className="text-xs text-graphite-400">Comentario global de la interrogación</p>
            </div>
          </div>

          <textarea
            value={generalObservation}
            onChange={e => setGeneralObservation(e.target.value)}
            placeholder="Ingrese una observación general sobre el desempeño del estudiante en la interrogación oral. Este texto se incluirá en el PDF."
            rows={8}
            className="flex-1 w-full text-sm border border-graphite-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 resize-none transition text-graphite-800 leading-relaxed"
          />

          <p className="text-[11px] text-graphite-400">
            Este campo es opcional. Puede dejar notas sobre la actitud, el desarrollo del discurso,
            la profundidad conceptual, etc.
          </p>
        </div>
      </div>

      {/* ── FILA 4: Borrador de feedback ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card border border-graphite-100 p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-4 border-b border-graphite-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-academic-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-academic-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-graphite-800">Borrador de retroalimentación</h2>
              <p className="text-xs text-graphite-400">
                Generado automáticamente a partir de los datos del formulario — sin IA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerateDraft}
            className="inline-flex items-center gap-2 px-4 py-2 bg-academic-600 hover:bg-academic-700 text-white text-sm font-semibold rounded-xl shadow-sm transition active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Generar borrador
          </button>
        </div>

        <textarea
          value={feedbackDraft}
          onChange={e => setFeedbackDraft(e.target.value)}
          placeholder="Haga clic en «Generar borrador» para crear un texto de retroalimentación a partir de los datos ingresados. Luego puede editarlo libremente antes de incluirlo en el PDF."
          rows={14}
          className="w-full text-sm border border-graphite-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 resize-none transition font-mono text-graphite-800 leading-relaxed"
        />

        <p className="text-[11px] text-graphite-400">
          El borrador se genera a partir de los datos del formulario (sin IA). Puede editarlo libremente.
          {feedbackDraft && ' Este texto no se incluye automáticamente en el PDF — es solo un borrador para referencia.'}
        </p>
      </div>

      {/* ── FILA 5: Advertencias y acciones ─────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 mb-1">Revise antes de generar el PDF</p>
              <ul className="space-y-0.5">
                {warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0"></span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setWarnings([])}
              className="text-amber-400 hover:text-amber-600 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card border border-graphite-100 px-6 py-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Exportar */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-academic-600 hover:bg-academic-700 text-white text-sm font-semibold rounded-xl shadow-sm transition active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar PDF
            </button>
          </div>

          {/* Borrador local */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-graphite-700 hover:bg-graphite-800 text-white text-sm font-medium rounded-xl border border-graphite-600 transition"
            >
              {savedMsg ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-300">Guardado</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Guardar borrador
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLoadDraft}
              disabled={!hasDraft}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-graphite-50 hover:bg-graphite-100 text-graphite-700 text-sm font-medium rounded-xl border border-graphite-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Cargar último borrador
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-graphite-50 hover:bg-red-50 text-graphite-600 hover:text-red-600 text-sm font-medium rounded-xl border border-graphite-200 hover:border-red-200 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Limpiar
            </button>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-graphite-400">
          "Limpiar" borra los datos del estudiante y reinicia el cronómetro, pero conserva la configuración de escala.
          Los borradores se guardan solo en este navegador (localStorage).
        </p>
      </div>
    </div>
  );
}
