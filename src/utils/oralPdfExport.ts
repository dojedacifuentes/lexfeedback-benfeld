import jsPDF from 'jspdf';
import type { OralExamData, AppConfig } from '../types';
import { formatGrade } from './gradeCalculator';

function formatDateForPDF(isoDate: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function generateOralPDF(exam: OralExamData, config: AppConfig): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PW = 210;
  const PH = 297;
  const ML = 22;
  const MR = 22;
  const MT = 28;
  const MB = 28;
  const CW = PW - ML - MR;

  let y = MT;

  const checkBreak = (needed: number) => {
    if (y + needed > PH - MB) {
      doc.addPage();
      y = MT;
    }
  };

  // ── ENCABEZADO ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(30, 58, 95);
  doc.text('Informe de Interrogación Oral', ML, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 115, 130);
  const subtitle = [config.subject, 'Pontificia Universidad Católica de Valparaíso']
    .filter(Boolean).join('  ·  ');
  doc.text(subtitle || 'Pontificia Universidad Católica de Valparaíso', ML, y);
  y += 5;

  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.7);
  doc.line(ML, y, PW - MR, y);
  y += 9;

  // ── TABLA DE DATOS ──────────────────────────────────────────────────────────
  const gradeNum = parseFloat(exam.finalGrade);
  const baseRows: [string, string][] = [
    ['Asignatura',         config.subject || '—'],
    ['Profesor titular',   config.professor],
    ['Estudiante',         exam.studentName || '—'],
    ['Fecha',              formatDateForPDF(exam.date)],
  ];
  if (exam.duration && exam.duration !== '00:00') {
    baseRows.push(['Duración', exam.duration]);
  }
  baseRows.push(
    ['Preguntas evaluadas', exam.questions.length.toString()],
    ['Puntaje total',       `${exam.totalScore || '—'} / ${exam.totalMaxScore}`],
    ['Exigencia aplicada',  `${exam.scaleConfig.requirementPercent}%`],
    ['Nota final',          formatGrade(exam.finalGrade)],
  );
  const infoRows = baseRows;

  const LABEL_W  = 52;
  const ROW_H    = 7;
  const CELL_PAD = 3;

  doc.setFontSize(9.5);

  infoRows.forEach(([label, value], i) => {
    checkBreak(ROW_H + 2);
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 251);
      doc.rect(ML, y - ROW_H + 1.5, CW, ROW_H, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 62, 88);
    doc.text(label, ML + CELL_PAD, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(22, 22, 35);

    if (label === 'Nota final') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(
        gradeNum >= 4.0 ? 22  : 139,
        gradeNum >= 4.0 ? 101 : 25,
        gradeNum >= 4.0 ? 52  : 47,
      );
      doc.text(formatGrade(exam.finalGrade), ML + LABEL_W, y);
      doc.setFontSize(9.5);
      doc.setTextColor(22, 22, 35);
    } else {
      doc.text(value, ML + LABEL_W, y);
    }
    y += ROW_H;
  });

  y += 6;
  doc.setDrawColor(195, 200, 212);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PW - MR, y);
  y += 9;

  // ── SECCIÓN PREGUNTAS ────────────────────────────────────────────────────────
  checkBreak(16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text('Preguntas evaluadas', ML, y);
  y += 8;

  const LH = 5.8;

  exam.questions.forEach((q, idx) => {
    checkBreak(14);

    // Encabezado de pregunta
    const scoreStr  = q.score !== '' ? q.score : '—';
    const topicStr  = q.topic.trim() || '(sin título)';
    const headerTxt = `Pregunta ${idx + 1} — ${topicStr}  (${scoreStr} / ${q.maxScore} pts.)`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 95);
    (doc.splitTextToSize(headerTxt, CW) as string[]).forEach(line => {
      checkBreak(6);
      doc.text(line, ML, y);
      y += 6;
    });

    // Observación
    if (q.observation.trim()) {
      checkBreak(6);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(80, 90, 110);
      (doc.splitTextToSize(q.observation.trim(), CW - 4) as string[]).forEach(line => {
        checkBreak(LH);
        doc.text(line, ML + 4, y);
        y += LH;
      });
    }

    // Criterios cumplidos
    const checked = q.criteria.filter(c => c.checked).map(c => c.label);
    if (checked.length > 0) {
      checkBreak(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(22, 101, 52);
      const critText = `Criterios logrados: ${checked.join(' · ')}`;
      (doc.splitTextToSize(critText, CW - 4) as string[]).forEach(line => {
        checkBreak(5);
        doc.text(line, ML + 4, y);
        y += 5;
      });
    }

    y += 4;
  });

  // ── HITOS DEL CRONÓMETRO ──────────────────────────────────────────────────
  if (exam.milestones.length > 0) {
    checkBreak(16);
    doc.setDrawColor(195, 200, 212);
    doc.setLineWidth(0.3);
    doc.line(ML, y, PW - MR, y);
    y += 9;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text('Hitos del cronómetro', ML, y);
    y += 7;

    exam.milestones.forEach(m => {
      checkBreak(6);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 62, 88);
      doc.text(m.elapsed, ML, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 70, 85);
      const descLines = doc.splitTextToSize(m.description || '—', CW - 20) as string[];
      descLines.forEach((line, li) => {
        checkBreak(5.5);
        doc.text(line, ML + 20, li === 0 ? y : y);
        if (li === 0) y += 6;
        else y += 5.5;
      });
      if (descLines.length === 1) {
        // already advanced above
      } else {
        // correction: we advanced once in the loop, subtract extra
      }
    });
  }

  // ── OBSERVACIÓN GENERAL ───────────────────────────────────────────────────
  if (exam.generalObservation.trim()) {
    checkBreak(16);
    doc.setDrawColor(195, 200, 212);
    doc.setLineWidth(0.3);
    doc.line(ML, y, PW - MR, y);
    y += 9;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text('Observación general', ML, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(28, 28, 38);

    exam.generalObservation.split('\n').forEach(para => {
      if (para.trim() === '') { y += LH * 0.55; return; }
      (doc.splitTextToSize(para, CW) as string[]).forEach(line => {
        checkBreak(LH + 2);
        doc.text(line, ML, y);
        y += LH;
      });
    });
  }

  // ── PIE DE PÁGINA ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPages = (doc.internal as any).getNumberOfPages() as number;
  const footerLeft = [
    config.subject || 'Asignatura',
    config.professor,
    `Estudiante: ${exam.studentName || '—'}`,
  ].join('  ·  ');

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setDrawColor(195, 200, 212);
    doc.setLineWidth(0.25);
    doc.line(ML, PH - 18, PW - MR, PH - 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(144, 153, 168);
    doc.text(footerLeft, ML, PH - 12);

    doc.setFontSize(6.5);
    doc.setTextColor(180, 185, 195);
    doc.text('Nota calculada mediante escala lineal por tramos.  ·  Interrogación oral.', ML, PH - 7);

    if (totalPages > 1) {
      doc.setFontSize(7.5);
      doc.setTextColor(144, 153, 168);
      doc.text(`Página ${p} de ${totalPages}`, PW - MR, PH - 12, { align: 'right' });
    }
  }

  // ── GUARDAR ──────────────────────────────────────────────────────────────────
  const slug = (exam.studentName || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();

  doc.save(`interrogacion_oral_${slug || 'estudiante'}.pdf`);
}
