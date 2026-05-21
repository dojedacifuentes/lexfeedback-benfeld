# LexFeedback Benfeld

Demo académica personalizada para el **Profesor Johann Benfeld Escobar** (Filosofía del Derecho, PUCV), orientada a facilitar la generación de retroalimentaciones individuales en evaluaciones de Filosofía del Derecho.

Demo creada por **Diego Ojeda**, Ayudante de Filosofía del Derecho PUCV.

---

## Características

- Ingreso manual de: nombre del estudiante, número de prueba, puntaje obtenido
- Calculadora dinámica de notas: escala lineal por dos tramos (compatible con escaladenotas.cl)
- Puntaje máximo configurable (20, 25, 40, 100, etc.)
- Exigencia configurable con presets 51 %, 60 %, 65 % o valor libre
- Configuración avanzada: nota mínima, aprobación, máxima y modo de redondeo
- Nota final editable manualmente (con opción de restaurar la automática)
- Exportación a PDF formal, con soporte para textos largos y paginación automática
- Exportación a Word (.docx)
- Vista previa del documento antes de exportar
- Panel de envío por correo (mailto — sin backend)
- Botón "Limpiar para siguiente estudiante" que conserva escala y fecha
- Sin backend · Sin login · Sin envío de datos externos
- Procesamiento 100 % local en el navegador

---

## Stack

| Tecnología | Uso |
|---|---|
| React 19 + TypeScript | UI y lógica |
| Vite 6 | Bundler |
| TailwindCSS 3 | Estilos |
| jsPDF | Generación de PDF |
| docx | Generación de Word |

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Vista previa del build
npm run preview
```

Abre [http://localhost:5173](http://localhost:5173) en el navegador.

---

## Despliegue en Vercel

1. Sube el proyecto a un repositorio GitHub
2. En [vercel.com/new](https://vercel.com/new) importa el repositorio
3. Vercel detecta Vite automáticamente — sin configuración adicional
4. Haz clic en **Deploy**

El proyecto no requiere variables de entorno.

---

## Estructura del proyecto

```
lexfeedback-benfeld/
├── src/
│   ├── data/
│   │   └── gradeScale.ts          # Wrapper de compatibilidad
│   ├── utils/
│   │   ├── gradeCalculator.ts     # Motor de cálculo dinámico
│   │   ├── pdfExport.ts           # Generación de PDF
│   │   └── wordExport.ts          # Generación de Word
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── EvaluationForm.tsx     # Formulario con configuración de escala
│   │   ├── FeedbackPanel.tsx
│   │   ├── DocumentPreview.tsx
│   │   ├── ActionButtons.tsx
│   │   ├── EmailPanel.tsx
│   │   └── Footer.tsx
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## Notas de uso

- La escala **51 %** viene seleccionada por defecto con puntaje máximo 100
- El puntaje debe ingresarse **manualmente** (la app no lo detecta desde el texto)
- La nota se puede editar manualmente; un badge indica si fue "auto" o "manual"
- El PDF y el Word respetan los saltos de línea del texto pegado
- "Limpiar" borra los datos del estudiante pero conserva la configuración de escala
- Los datos no se almacenan ni se envían a ningún servidor

---

*LexFeedback Benfeld — Demo académica · PUCV · Filosofía del Derecho*
