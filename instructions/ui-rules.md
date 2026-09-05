# ui-rules.md — Reglas de UI

> Estética "boutique": femenina, elegante, luminosa. Sistema de diseño completo
> en `agents/uiux.md`; aquí están las reglas de ejecución.

## Tokens y colores

- Solo Tailwind v4 + CSS variables semánticas (`--background`, `--primary`,
  `--muted`...) y tokens `bella-*`. **Prohibido hex/rgb inline** en componentes.
- Paleta: rosa pastel `bella-500 #D96A8B` (primario), lavanda, dorado suave,
  blanco, gris claro. Dark mode con fondo violeta oscuro (`#1C1723`), no negro.
- Contraste AA: para texto pequeño usar `bella-600`, nunca `bella-300`.
- Colores de estado de cita (calendario) fijados en `agents/uiux.md` §Semántica.

## Tipografía

- Headings: `font-display` (Fraunces/Playfair). Cuerpo: `font-sans` (Inter).
- Escala: `text-sm` (14) mínimo en UI, inputs `text-base` (16, evita zoom iOS),
  headings `text-xl` → `text-3xl` según jerarquía.
- Un solo H1 por página (`PageHeader`).
- Números tabulares (`tabular-nums`) en montos, comisiones y tablas.

## Layout y espaciado

- Mobile first: estilos base = 375px; breakpoint progression `sm:640 md:768
lg:1024 xl:1280`.
- Navegación: bottom nav en móvil, sidebar en `lg:` y superior.
- Espaciado generoso: cards `p-5`, secciones `py-8`, gaps `gap-4`+.
- Cards `rounded-2xl` + `shadow-soft`; botones pill (`rounded-full`).
- Máximo de contenido útil ~72ch en lecturas largas.

## Componentes

- Base: shadcn/ui en `components/ui/` (no editar lo generado a mano; ajustar
  vía wrappers en `components/shared/`).
- Los 15 componentes compartidos listados en `agents/frontend.md` son la API de
  UI: si falta uno, crearlo en `shared/` antes de duplicarlo.
- Íconos: Lucide únicamente; `h-4 w-4` inline, `h-5 w-5` en botones.
- Botones: un primario por vista; estados hover/active/focus/disabled/
  loading (spinner dentro del botón, no bloqueo global).

## Estados obligatorios por vista

1. **Loading**: skeletons con shimmer suave (mismo layout que el contenido).
2. **Empty**: icono Lucide + título cálido + subtítulo accionable + CTA
   ("Aún no hay citas hoy" + botón "Nueva cita").
3. **Error**: mensaje claro + botón reintentar; nunca pantalla en blanco.

## Interacción

- Microinteracciones 150–200ms `ease-out`; hover de cards: `translate-y-[-2px]`
  - sombra. Respetar `prefers-reduced-motion` (sin transformaciones).
- Optimistic UI en toggles de estado de cita (confirmar/cancelar).
- Feedback de formularios: validación al blur, error del server inline, botón
  con spinner mientras `isSubmitting`.
- Toasts (sonner/shadcn) para resultados de acciones; nunca `alert()`.

## Formularios

- `Label` siempre visible (no solo placeholder); helper text en `text-muted-foreground`.
- `MoneyInput` con símbolo de moneda según `currency` seleccionada.
- `PhoneInput` NIC con prefijo +505 fijo y formateo 8 dígitos.
- Selects de negocio: `ServiceSelector`, `EmployeeSelector` (con avatar y color),
  `PaymentMethodSelector` (con ícono por método).

## Tablas (desktop) y listas (móvil)

- Desktop: TanStack Table con sticky header, orden por columna, paginación.
- Móvil: convertir filas a cards (patrón lista-cards); no scroll horizontal.
- Montos siempre alineados a la derecha con `tabular-nums`.

## Accesibilidad

- Targets táctiles ≥ 44×44px; separación ≥ 8px.
- Focus visible (ring `bella-500`) en todo elemento interactivo.
- Labels/aria para todos los inputs; iconos decorativos `aria-hidden`.
- El calendario FullCalendar con navegación por teclado verificada.

## PWA

- `manifest.webmanifest` con íconos 192/512, `theme-color` por modo.
- Instalable; splash iOS; offline graceful (página "Sin conexión", no data stale).
