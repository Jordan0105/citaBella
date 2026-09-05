---
name: create-calendar-feature
description: "Use when adding or changing any appointment calendar functionality with FullCalendar: calendar-view/toolbar/event components, drag-and-drop reschedule, event click side panel, new appointment from slot selection, status colors ('Cita realizada'), timeZone America/Managua, performance (next/dynamic, lazyFetching) and mobile/accessibility. Triggers: calendario, calendar, FullCalendar, evento, event, slot."
---

# Skill: create-calendar-feature

> Receta para agregar funcionalidades al calendario FullCalendar. Dueños:
> **frontend** + **backend**. Lee `agents/frontend.md`, `agents/uiux.md`
> §Semántica de color, `docs/business-rules.md` §Agenda.

## Estado actual de referencia (mapa del calendario)

```
src/features/appointments/
├── components/
│   ├── calendar-view.tsx          # "use client" — wrapper FullCalendar
│   ├── calendar-toolbar.tsx       # vistas, filtros (empleado, estado)
│   └── appointment-event.tsx      # render custom del evento
├── actions/                       # create/update/finalize/cancel
└── queries/                       # useAppointmentsInRange(from, to)
```

## Paso 1 — Decidir el tipo de feature

| Tipo        | Ejemplo                               | Toca                            |
| ----------- | ------------------------------------- | ------------------------------- |
| Visual      | nuevo color/estado, badge             | `appointment-event.tsx`, `uiux` |
| Datos       | filtro nuevo, drag&drop reschedule    | queries + action + RPC          |
| Flujo       | botón de acción en evento (confirmar) | action + optimistic UI          |
| Rendimiento | virtualización, cache                 | queries + config FC             |

## Paso 2 — Fuentes de datos (patrón)

```tsx
// calendar-view.tsx (client) — recibe initialData del server
const { data } = useAppointmentsInRange(rangeStartISO, rangeEndISO);

const events: EventInput[] = data.map((a) => ({
  id: a.id,
  title: `${a.client.name} · ${a.service.name}`,
  start: a.startsAt, // ISO con tz
  end: a.endsAt,
  backgroundColor: statusColors[a.status].bg, // tokens de uiux
  borderColor: a.employee.color, // color de la trabajadora
  extendedProps: { appointment: a },
}));
```

- Fechas SIEMPRE ISO con tz; FullCalendar configurado con
  `timeZone: "America/Managua"` y `locale: "es"`.
- Rango de fetch con margen (±1 día) y caché por rango en TanStack Query.
- Solo-owner/recepcionista ven todas; worker recibe solo las suyas (RLS).

## Paso 3 — Interacciones frecuentes (recetas)

### Drag & drop para reprogramar

1. `editable: true` solo si el rol puede (`owner`, `receptionist` en
   pendiente/confirmada).
2. `eventDrop` → optimistic update local → action `rescheduleAppointment`
   (RPC valida conflicto/`blocked_dates`).
3. Si el RPC devuelve `SLOT_TAKEN`/`OUT_OF_SCHEDULE`: rollback + toast con el
   mensaje del server.

### Click en evento → panel lateral

1. `eventClick` abre `Sheet` (Radix) con `AppointmentCard` + acciones según rol.
2. Acciones: Confirmar, Iniciar (in_progress), Finalizar (owner/worker),
   Cancelar (con motivo). Finalizar usa skill `create-commission-feature`.

### Botón "Nueva cita"

1. `dateClick`/`select` (selección de slot) → abre `AppointmentForm` con fecha
   /hora prellenadas.

## Paso 4 — Estados visuales (regla fija de uiux)

- Colores por estado: pendiente ámbar, confirmada lavanda, en proceso azul
  suave, **finalizada = "Cita realizada"** (verde salvia + icono check +
  opacidad 0.75 + badge), cancelada gris rayada tachada.
- Color de trabajadora: borde izquierdo del evento.
- `eventContent` custom para render accesible (texto + icono, no solo color).

## Paso 5 — Rendimiento y móvil

- `next/dynamic` para el wrapper FullCalendar (`ssr: false`), loading skeleton
  en el server.
- Vistas: `timeGridDay` (default móvil), `timeGridWeek`, `dayGridMonth`.
- En móvil: `headerToolbar` compacto (custom `CalendarToolbar` con botones
  táctiles ≥ 44px), `allDaySlot: false`, `slotMinTime`/`slotMaxTime` según
  horario del salón.
- `lazyFetching: true` + `datesSet` para fetch por rango visible.

## Paso 6 — Accesibilidad

- Navegación por teclado: verificar flechas entre eventos, botones con
  `aria-label` ("Semana siguiente").
- Anunciar cambios de vista con `aria-live` en el título del rango.
- Panel lateral: focus trap correcto (Radix Sheet), `Esc` cierra.

## Paso 7 — Verificación

- [ ] Conflicto de horario probado (drag sobre slot ocupado → rollback + toast).
- [ ] "Cita realizada" visualmente distinta (check + opacidad + badge).
- [ ] Worker solo ve sus citas (RLS real).
- [ ] Fechas correctas cruzando medianoche y fin de semana (tz Managua).
- [ ] E2E: crear, mover y finalizar cita en mobile + desktop viewport.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` verde.

## Anti-patrones

- Validar conflictos en el cliente (la verdad está en el RPC).
- Fetch de todas las citas sin rango.
- Colores hardcodeados fuera de `statusColors` (tokens uiux).
- Mutaciones financieras (finalizar) como optimistic UI.
