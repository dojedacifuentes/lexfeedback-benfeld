import { useState, useEffect } from 'react';
import { calculateDynamicGrade } from './utils/gradeCalculator';
import { generatePDF } from './utils/pdfExport';
import { generateWord } from './utils/wordExport';
import Header from './components/Header';
import EvaluationForm from './components/EvaluationForm';
import FeedbackPanel from './components/FeedbackPanel';
import DocumentPreview from './components/DocumentPreview';
import ActionButtons from './components/ActionButtons';
import Footer from './components/Footer';
import EmailPanel from './components/EmailPanel';
import type { AppConfig, EvaluationData, ScaleConfig } from './types';
import { DEFAULT_SCALE_CONFIG } from './types';

const BASE_CONFIG = {
  professor:     'Profesor Johann Benfeld Escobar',
  createdBy:     'Diego Ojeda',
  createdByRole: 'Ayudante de Filosofía del Derecho PUCV',
};

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

export default function App() {
  const [subject,      setSubject]      = useState('Filosofía del Derecho');
  const [studentName,  setStudentName]  = useState('');
  const [testNumber,   setTestNumber]   = useState('');
  const [totalScore,   setTotalScore]   = useState('');
  const [scaleConfig,  setScaleConfig]  = useState<ScaleConfig>(DEFAULT_SCALE_CONFIG);
  const [finalGrade,   setFinalGrade]   = useState('');
  const [isManual,     setIsManual]     = useState(false);
  const [feedback,     setFeedback]     = useState('');
  const [date,         setDate]         = useState(getTodayISO);
  const [warnings,     setWarnings]     = useState<string[]>([]);
  const [copied,       setCopied]       = useState(false);

  const config: AppConfig = { ...BASE_CONFIG, subject };

  // ── Auto-calcula nota cuando cambia puntaje o configuración de escala ────────
  useEffect(() => {
    if (isManual) return;
    if (totalScore === '') { setFinalGrade(''); return; }

    const result = calculateDynamicGrade({
      score:              parseFloat(totalScore),
      maxScore:           parseFloat(scaleConfig.maxScore)           || 100,
      requirementPercent: parseFloat(scaleConfig.requirementPercent) || 51,
      minGrade:           parseFloat(scaleConfig.minGrade)           || 1.0,
      passingGrade:       parseFloat(scaleConfig.passingGrade)       || 4.0,
      maxGrade:           parseFloat(scaleConfig.maxGrade)           || 7.0,
      roundingMode:       scaleConfig.roundingMode,
    });
    setFinalGrade(result);
  }, [totalScore, scaleConfig, isManual]);

  function handleScoreChange(v: string) {
    setTotalScore(v);
    setIsManual(false);
  }

  function handleScaleConfigChange(c: ScaleConfig) {
    setScaleConfig(c);
    setIsManual(false);  // cualquier cambio de escala recalcula la nota
  }

  function handleGradeManualEdit(v: string) {
    setFinalGrade(v);
    setIsManual(true);
  }

  function handleRestoreAutoGrade() {
    setIsManual(false);
    if (totalScore !== '') {
      const result = calculateDynamicGrade({
        score:              parseFloat(totalScore),
        maxScore:           parseFloat(scaleConfig.maxScore)           || 100,
        requirementPercent: parseFloat(scaleConfig.requirementPercent) || 51,
        minGrade:           parseFloat(scaleConfig.minGrade)           || 1.0,
        passingGrade:       parseFloat(scaleConfig.passingGrade)       || 4.0,
        maxGrade:           parseFloat(scaleConfig.maxGrade)           || 7.0,
        roundingMode:       scaleConfig.roundingMode,
      });
      setFinalGrade(result);
    }
  }

  function handleClear() {
    setStudentName('');
    setTestNumber('');
    setTotalScore('');
    setFinalGrade('');
    setFeedback('');
    setIsManual(false);
    setWarnings([]);
    // Conserva: scaleConfig, date, subject, config
  }

  function buildWarnings(): { blocking: string[]; all: string[] } {
    const maxS = parseFloat(scaleConfig.maxScore) || 100;
    const all: string[] = [];

    if (!studentName.trim())
      all.push('Falta el nombre del estudiante.');
    if (!totalScore.trim())
      all.push('Falta el puntaje obtenido.');
    else {
      const n = parseFloat(totalScore);
      if (isNaN(n) || n < 0 || n > maxS)
        all.push(`El puntaje debe ser un número entre 0 y ${maxS}.`);
    }
    if (!feedback.trim())
      all.push('Falta el texto de retroalimentación.');
    if (!testNumber.trim())
      all.push('No se ingresó número de prueba (aparecerá "—" en el documento).');

    const blocking = all.filter(w => !w.includes('número de prueba'));
    return { blocking, all };
  }

  function buildEvaluation(): EvaluationData {
    return {
      studentName:   studentName.trim(),
      testNumber:    testNumber.trim(),
      totalScore,
      scaleConfig,
      finalGrade:    finalGrade || '—',
      isManualGrade: isManual,
      feedback:      feedback.trim(),
      date,
    };
  }

  function handleDownloadPDF() {
    const { blocking, all } = buildWarnings();
    if (blocking.length > 0) { setWarnings(all); return; }
    setWarnings(all);
    generatePDF(buildEvaluation(), config);
  }

  function handleDownloadWord() {
    const { blocking, all } = buildWarnings();
    if (blocking.length > 0) { setWarnings(all); return; }
    setWarnings(all);
    void generateWord(buildEvaluation(), config);
  }

  async function handleCopyText() {
    const ev = buildEvaluation();
    const lines = [
      'RETROALIMENTACIÓN DE EVALUACIÓN',
      `Asignatura: ${config.subject || '—'}`,
      `Profesor titular: ${config.professor}`,
      `Estudiante: ${ev.studentName || '—'}`,
      `Prueba N°: ${ev.testNumber || '—'}`,
      `Puntaje obtenido: ${ev.totalScore || '—'} / ${scaleConfig.maxScore}`,
      `Exigencia: ${scaleConfig.requirementPercent}%`,
      `Nota final: ${ev.finalGrade ? ev.finalGrade.replace('.', ',') : '—'}`,
      `Fecha: ${date}`,
      '',
      'RETROALIMENTACIÓN',
      ev.feedback || '—',
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* sin clipboard API */ }
  }

  const evaluationData: EvaluationData = {
    studentName, testNumber, totalScore, scaleConfig,
    finalGrade, isManualGrade: isManual, feedback, date,
  };

  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      <Header config={config} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <EvaluationForm
            subject={subject}
            studentName={studentName}
            testNumber={testNumber}
            totalScore={totalScore}
            scaleConfig={scaleConfig}
            finalGrade={finalGrade}
            isManualGrade={isManual}
            date={date}
            onSubjectChange={setSubject}
            onStudentNameChange={setStudentName}
            onTestNumberChange={setTestNumber}
            onTotalScoreChange={handleScoreChange}
            onScaleConfigChange={handleScaleConfigChange}
            onFinalGradeChange={handleGradeManualEdit}
            onDateChange={setDate}
            onRestoreAutoGrade={handleRestoreAutoGrade}
          />
          <FeedbackPanel
            feedback={feedback}
            onFeedbackChange={setFeedback}
          />
        </div>

        <DocumentPreview evaluation={evaluationData} config={config} />

        <ActionButtons
          onDownloadPDF={handleDownloadPDF}
          onDownloadWord={handleDownloadWord}
          onClear={handleClear}
          onCopyText={handleCopyText}
          onRestoreAutoGrade={handleRestoreAutoGrade}
          isManualGrade={isManual}
          copied={copied}
          warnings={warnings}
          onDismissWarnings={() => setWarnings([])}
        />

        <EmailPanel
          studentName={studentName}
          subject={subject}
          professor={config.professor}
        />
      </main>

      <Footer config={config} />
    </div>
  );
}
