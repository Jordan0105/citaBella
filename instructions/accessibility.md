# accessibility.md — Accesibilidad (WCAG 2.1 AA)

> Toda la UI de CitaBella debe ser usable por personas con discapacidad
> visual, motriz o cognitiva. Es un requisito de la Definition of Done, no un extra.

## Principios por prioridad

### 1. Perceptible

- Contraste mínimo **4.5:1** texto normal, **3:1** texto grande (≥18.66px bold
  o 24px) y elementos de interfaz (bordes de inputs, iconos funcionales).
  - Rosa `bella-500` solo para elementos decorativos/grandes; texto rosa usa `bella-600`.
  - En dark mode, verificar sobre `#1C1723` (el blanco puro de texto es válido,
    las superficies grises lavanda necesitan revisión).
- Color nunca como único indicador: los estados de cita llevan icono + etiqueta
  (`Check` + "Realizada"), no solo color.
- Texto alternativo en imágenes significativas; decorativas con `aria-hidden`.
- Zoom 200% sin pérdida de contenido ni scroll horizontal.

### 2. Operable

- **Teclado completo**: todo flujo (login → crear cita → finalizar) navegable
  sin mouse. Atajos documentados si se agregan (no secuestrar teclas del browser).
- Focus visible SIEMPRE (`focus-visible:ring-2 ring-bella-500 ring-offset-2`);
  nunca `outline-none` sin reemplazo.
- Orden de tab lógico = orden visual; sin trampas de foco en modales (Radix
  gestiona focus trap; no romperlo).
- Targets táctiles ≥ 44×44px (botones de calendario móvil, bottom nav).
- `skip to content` en el layout del dashboard.
- Modales: `role="dialog"`, foco al abrir, `Esc` cierra, foco devuelve al trigger.
- Calendario FullCalendar: botones accesibles, anunciar cambio de vista/mes.

### 3. Comprensible

- `lang="es-NI"` en `<html>`.
- Labels persistentes (no solo placeholder) y `htmlFor`/`id` correctos.
- Mensajes de error claros y adyacentes al campo:
  "Teléfono inválido: usa 8 dígitos, ej. 8412 3456".
- Instrucciones antes del campo, no después.
- Errores de formulario agregados con `aria-invalid` y `aria-describedby`.
- Feedback de acciones asíncronas accesible: toasts con `role="status"`
  (sonner lo maneja), spinners con `aria-busy` en el contenedor.

### 4. Robusto

- HTML semántico: `header`, `nav`, `main`, `section`, `h1–h3` jerárquicos,
  `table` con `th scope`, `button` para acciones (no `div` clickable).
- ARIA solo donde el HTML nativo no llega; preferir primitivos Radix
  (dialog, dropdown, tabs, tooltip ya son accesibles).
- `aria-live="polite"` para conteos que cambian ("Citas de hoy: 12").
- Formularios con autocomplete correcto (`name`, `tel`, `email`, `bday`).
- IDs únicos; sin duplicados tras listas mapeadas.

## Patrones específicos de CitaBella

| Componente         | Requisito                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `MoneyInput`       | label "Precio", símbolo de moneda fuera del input (no confundir lector), `inputMode="decimal"` |
| `PhoneInput`       | prefijo +505 visible, `inputMode="tel"`, autocomplete `tel`                                    |
| `StatusBadge`      | texto legible siempre ("Finalizada"), no solo punto de color                                   |
| `CalendarToolbar`  | botones con `aria-label` ("Mes siguiente"), estado actual `aria-pressed`                       |
| `EmployeeSelector` | color de trabajadora + nombre (color nunca solo)                                               |
| Charts             | resumen en texto de la tendencia + tabla de datos accesible (`<table>` oculta o toggle)        |
| Bottom nav         | `aria-current="page"` en la pestaña activa                                                     |

## Checklist de accesibilidad por PR (pegar en descripción)

- [ ] Navegable 100% con teclado (probar el flujo completo).
- [ ] Focus visible en todos los interactivos nuevos.
- [ ] Contraste AA claro + oscuro (verificado con herramienta).
- [ ] Labels + errores anunciados (probar con VoiceOver/NVDA si hay cambios de form).
- [ ] 200% zoom sin romper layout.
- [ ] Sin ARIA incorrecto (validar con axe DevTools — 0 errores críticos).
