import { useState } from 'react';
import type { OralMilestone } from '../types';

interface OralTimerProps {
  display:                 string;         // cadena formateada "MM:SS" / "HH:MM:SS"
  running:                 boolean;
  milestones:              OralMilestone[];
  onToggle:                () => void;
  onReset:                 () => void;
  onAddMilestone:          (desc: string) => void;
  onRemoveMilestone:       (id: string) => void;
  onUpdateMilestoneDesc:   (id: string, desc: string) => void;
}

export default function OralTimer({
  display, running, milestones,
  onToggle, onReset, onAddMilestone, onRemoveMilestone, onUpdateMilestoneDesc,
}: OralTimerProps) {
  const [milestoneDesc, setMilestoneDesc] = useState('');

  function handleMarkMilestone() {
    onAddMilestone(milestoneDesc.trim());
    setMilestoneDesc('');
  }

  return (
    <div className="bg-white rounded-2xl shadow-card border border-graphite-100 p-5 flex flex-col gap-4">
      {/* Encabezado */}
      <div className="flex items-center gap-2 pb-3 border-b border-graphite-100">
        <div className="w-7 h-7 rounded-lg bg-academic-50 flex items-center justify-center">
          <svg className="w-4 h-4 text-academic-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-graphite-800">Cronómetro</h2>
          <p className="text-xs text-graphite-400">Registre duración e hitos</p>
        </div>
      </div>

      {/* Display */}
      <div className="text-center py-2">
        <span className={`font-mono text-5xl font-bold tracking-tight select-none ${
          running ? 'text-academic-600' : 'text-graphite-700'
        }`}>
          {display}
        </span>
        {running && (
          <div className="flex justify-center mt-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              En curso
            </span>
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition active:scale-[0.98] ${
            running
              ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              : 'bg-academic-600 text-white hover:bg-academic-700'
          }`}
        >
          {running ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
              Pausar
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
              {display === '00:00' ? 'Iniciar' : 'Continuar'}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-graphite-50 text-graphite-600 border border-graphite-200 hover:bg-graphite-100 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reiniciar
        </button>
      </div>

      {/* Marcar hito */}
      <div className="flex gap-2">
        <input
          type="text"
          value={milestoneDesc}
          onChange={e => setMilestoneDesc(e.target.value)}
          placeholder="Descripción del hito (opcional)..."
          className="flex-1 text-sm border border-graphite-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-academic-400/40 focus:border-academic-400"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleMarkMilestone(); } }}
        />
        <button
          type="button"
          onClick={handleMarkMilestone}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-graphite-700 text-white hover:bg-graphite-800 transition flex-shrink-0"
          title="Marcar hito en el tiempo actual"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          Hito
        </button>
      </div>

      {/* Lista de hitos */}
      {milestones.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-graphite-500 uppercase tracking-wide mb-2">
            Hitos registrados
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {milestones.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center gap-2 bg-graphite-50 rounded-lg px-3 py-2 border border-graphite-100"
              >
                <span className="font-mono text-xs text-academic-600 font-bold w-14 flex-shrink-0">
                  {m.elapsed}
                </span>
                <input
                  type="text"
                  value={m.description}
                  onChange={e => onUpdateMilestoneDesc(m.id, e.target.value)}
                  className="flex-1 text-xs bg-transparent border-none outline-none text-graphite-700 min-w-0"
                  placeholder={`Hito ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => onRemoveMilestone(m.id)}
                  className="text-graphite-300 hover:text-red-400 transition flex-shrink-0"
                  title="Eliminar hito"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
