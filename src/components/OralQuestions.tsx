import { useState } from 'react';
import type { OralQuestion } from '../types';
import { ORAL_CRITERIA_LABELS } from '../types';

interface OralQuestionsProps {
  questions: OralQuestion[];
  onChange:  (q: OralQuestion[]) => void;
}

function makeQuestion(): OralQuestion {
  return {
    id:          `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    topic:       '',
    maxScore:    '10',
    score:       '',
    observation: '',
    criteria:    ORAL_CRITERIA_LABELS.map(label => ({ label, checked: false })),
  };
}

export { makeQuestion };

export default function OralQuestions({ questions, onChange }: OralQuestionsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function addQuestion() {
    const q = makeQuestion();
    onChange([...questions, q]);
    // Auto-expandir la nueva pregunta
    setExpanded(prev => ({ ...prev, [q.id]: true }));
  }

  function removeQuestion(id: string) {
    onChange(questions.filter(q => q.id !== id));
  }

  function updateQuestion(id: string, partial: Partial<OralQuestion>) {
    onChange(questions.map(q => q.id === id ? { ...q, ...partial } : q));
  }

  function toggleCriteria(qId: string, idx: number, checked: boolean) {
    onChange(questions.map(q => {
      if (q.id !== qId) return q;
      const criteria = q.criteria.map((c, i) => i === idx ? { ...c, checked } : c);
      return { ...q, criteria };
    }));
  }

  function toggleExpanded(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const totalMaxNum   = questions.reduce((s, q) => s + (parseFloat(q.maxScore) || 0), 0);
  const totalScoreNum = questions.reduce((s, q) => s + (parseFloat(q.score)    || 0), 0);

  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(1);

  return (
    <div className="flex flex-col gap-3">
      {questions.map((q, idx) => {
        const scoreNum    = parseFloat(q.score);
        const maxNum      = parseFloat(q.maxScore) || 0;
        const scoreError  = q.score !== '' && (!isNaN(scoreNum)) && scoreNum > maxNum;
        const scoreInvalid = q.score !== '' && isNaN(scoreNum);
        const isExp       = expanded[q.id] ?? false;
        const checkedCount = q.criteria.filter(c => c.checked).length;

        return (
          <div key={q.id} className="bg-white rounded-xl border border-graphite-100 shadow-card overflow-hidden">
            {/* Cabecera de la pregunta */}
            <div className="flex items-center gap-2 px-4 py-3 bg-graphite-50/70 border-b border-graphite-100">
              {/* Número */}
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-academic-600 text-white text-xs font-bold flex items-center justify-center">
                {idx + 1}
              </span>

              {/* Tema */}
              <input
                type="text"
                value={q.topic}
                onChange={e => updateQuestion(q.id, { topic: e.target.value })}
                placeholder={`Tema / enunciado de la pregunta ${idx + 1}...`}
                className="flex-1 min-w-0 text-sm bg-transparent border-none outline-none font-medium text-graphite-800 placeholder-graphite-400"
              />

              {/* Puntaje obtenido */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <input
                  type="number"
                  value={q.score}
                  min={0}
                  max={maxNum || undefined}
                  step={0.5}
                  onChange={e => updateQuestion(q.id, { score: e.target.value })}
                  placeholder="—"
                  title="Puntaje obtenido"
                  className={`w-14 text-center text-sm font-semibold border rounded-lg px-1.5 py-1.5 focus:outline-none focus:ring-2 transition ${
                    scoreError || scoreInvalid
                      ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-300/40'
                      : 'border-graphite-200 focus:ring-academic-400/40'
                  }`}
                />
                <span className="text-graphite-400 text-sm">/</span>
                <input
                  type="number"
                  value={q.maxScore}
                  min={0.5}
                  step={0.5}
                  onChange={e => updateQuestion(q.id, { maxScore: e.target.value })}
                  title="Puntaje máximo"
                  className="w-14 text-center text-sm border border-graphite-200 rounded-lg px-1.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-academic-400/40"
                />
                <span className="text-graphite-400 text-xs ml-1 hidden sm:inline">pts.</span>
              </div>

              {/* Toggle criterios */}
              <button
                type="button"
                onClick={() => toggleExpanded(q.id)}
                title={isExp ? 'Cerrar criterios' : 'Abrir criterios y observación'}
                className={`flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition ${
                  isExp
                    ? 'bg-academic-50 text-academic-700 border-academic-200'
                    : 'bg-white text-graphite-500 border-graphite-200 hover:border-academic-200 hover:text-academic-600'
                }`}
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${isExp ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {checkedCount > 0 && (
                  <span className="font-bold text-academic-600">{checkedCount}</span>
                )}
              </button>

              {/* Eliminar pregunta */}
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  title="Eliminar pregunta"
                  className="flex-shrink-0 text-graphite-300 hover:text-red-400 transition ml-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {/* Error de puntaje */}
            {(scoreError || scoreInvalid) && (
              <p className="px-4 py-1.5 text-xs text-red-600 bg-red-50 border-b border-red-100">
                {scoreInvalid
                  ? 'Ingrese un número válido.'
                  : `El puntaje no puede superar el máximo (${fmt(maxNum)} pts.).`}
              </p>
            )}

            {/* Panel expandido: observación + criterios */}
            {isExp && (
              <div className="px-4 py-4 space-y-4">
                {/* Observación */}
                <div>
                  <label className="block text-[11px] font-semibold text-graphite-500 uppercase tracking-wide mb-1.5">
                    Observación breve
                  </label>
                  <textarea
                    value={q.observation}
                    onChange={e => updateQuestion(q.id, { observation: e.target.value })}
                    placeholder="Descripción del desempeño en esta pregunta..."
                    rows={2}
                    className="w-full text-sm border border-graphite-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400 resize-none transition"
                  />
                </div>

                {/* Criterios */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold text-graphite-500 uppercase tracking-wide">
                      Criterios evaluados
                    </label>
                    {checkedCount > 0 && (
                      <span className="text-[11px] text-academic-600 font-medium">
                        {checkedCount} / {q.criteria.length} cumplidos
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {q.criteria.map((c, ci) => (
                      <label
                        key={ci}
                        className="flex items-start gap-2 cursor-pointer group py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={c.checked}
                          onChange={e => toggleCriteria(q.id, ci, e.target.checked)}
                          className="mt-0.5 w-3.5 h-3.5 rounded accent-academic-600 flex-shrink-0"
                        />
                        <span className={`text-xs leading-relaxed transition ${
                          c.checked
                            ? 'text-academic-700 font-medium'
                            : 'text-graphite-500 group-hover:text-graphite-700'
                        }`}>
                          {c.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Pie: agregar + totales */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={addQuestion}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-academic-50 text-academic-700 border border-academic-200 hover:bg-academic-100 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar pregunta
        </button>

        {questions.length > 0 && (
          <div className="text-sm text-graphite-600 bg-graphite-50 border border-graphite-200 rounded-lg px-3 py-1.5">
            <span className="text-graphite-500">Suma actual: </span>
            <span className={`font-bold ${totalScoreNum > totalMaxNum && totalMaxNum > 0 ? 'text-red-600' : 'text-graphite-800'}`}>
              {fmt(totalScoreNum)}
            </span>
            <span className="text-graphite-400"> / {fmt(totalMaxNum)} pts.</span>
          </div>
        )}
      </div>
    </div>
  );
}
