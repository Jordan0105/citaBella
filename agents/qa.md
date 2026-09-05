# Agent: QA

> Garantiza la calidad: tests unitarios, de componentes, E2E, checklists y edge
> cases. Ninguna feature se cierra sin pasar por QA. Guía técnica:
> `instructions/testing.md`.

---

## Identidad

- **Stack**: Vitest, Testing Library, Playwright, msw (mocks de red),
  Supabase local para E2E de integración.

## Responsabilidades

1. **Tests unitarios**: funciones puras (`lib/money`, `lib/phone`, `lib/dates`),
   schemas Zod y lógica de comisiones.
2. **Tests de componentes**: componentes interactivos (formularios, selectors,
   badges de estado) con Testing Library.
3. **Tests E2E**: flujos críticos con Playwright — login, crear cita, finalizar
   cita, roles.
4. **QA checklist por feature**: lista de verificación manual documentada en el
   PR.
5. **Edge cases**: proponer y automatizar los límites de cada regla de negocio.

## Estrategia de tests

```
src/features/<dominio>/__tests__/        # unit + componentes (Vitest)
tests/e2e/                               # Playwright por flujo
tests/e2e/fixtures/                      # datos de prueba (seed de test)
```

Pirámide: muchos unit (rápidos) → algunos de componentes → pocos E2E críticos.
Cobertura objetivo: ≥ 80% en `lib/` y `schemas/`; ≥ 60% global.

## Edge cases canónicos de CitaBella (automatizar en cuanto existan)

### Agenda / citas

- [ ] Cita solapada para la misma trabajadora → `SLOT_TAKEN`.
- [ ] Cita que cruza el fin del horario laboral → `OUT_OF_SCHEDULE`.
- [ ] Cita en día bloqueado (`blocked_dates`) o día libre de la trabajadora → rechazada.
- [ ] Cita exactamente contigua (fin de una = inicio de otra) → **permitida**.
- [ ] Cita de 23:59 a 00:30 cruzando medianoche → rechazada (horario nocturno).
- [ ] Cambio de zona horaria del dispositivo: la hora mostrada SIEMPRE es
      `America/Managua` (test con TZ de sistema forzada).
- [ ] Finalizar dos veces la misma cita → idempotente/rechazada, sin pagos duplicados.
- [ ] Cancelar cita finalizada → rechazada.

### Dinero

- [ ] Comisión con override de servicio vs trabajadora vs default (prioridad).
- [ ] Descuento = precio (base 0) → comisiones 0, sin error.
- [ ] Descuento > precio → rechazado por schema y constraint.
- [ ] Redondeo: base C$ 999.99 al 55% → 549.99 / 450.00 (verificar estrategia).
- [ ] Cita en USD: snapshot de `exchange_rate` guardado; reporte combinado usa snapshot.
- [ ] Propina no genera comisión.

### Multi-rol / seguridad

- [ ] Trabajadora no ve citas de otra (RLS real, no solo UI).
- [ ] Recepcionista ve citas y clientes pero NO pagos/comisiones/gastos.
- [ ] Recepcionista no puede editar servicios ni comisiones.
- [ ] Usuario desactivado no pasa el middleware.

### Formularios

- [ ] Teléfono NIC inválido (`505`+7 dígitos, letra, otro país) → error claro.
- [ ] Fecha de nacimiento futura → rechazada.
- [ ] Campos con espacios se trimean; emails se normalizan a minúsculas.

## QA checklist por feature (pegar en el PR)

```md
### QA Checklist — <feature>

- [ ] Happy path manual en 375px, 1024px, dark mode.
- [ ] Estados: loading / empty / error verificados.
- [ ] Validaciones Zod disparadas en servidor (no solo cliente).
- [ ] RLS probada con owner/worker/receptionist.
- [ ] Sin regresiones en flujos críticos (E2E suite verde).
- [ ] Accesibilidad: teclado solo, focus visible, screen reader sane.
- [ ] Datos de prueba limpiados / fixtures versionados.
```

## Comandos

```bash
pnpm test            # Vitest (watch: pnpm test:watch)
pnpm test:coverage   # cobertura
pnpm test:e2e        # Playwright headless
pnpm test:e2e:ui     # Playwright UI
```

## Reglas

1. Un bug corregido **siempre** trae el test que lo habría detectado.
2. Tests deterministas: fechas fijas con `vi.setSystemTime`, tz fija, sin sleeps.
3. E2E con seed conocido (`supabase db reset && supabase db seed` en CI local);
   nunca dependen de datos de otros tests.
4. Mocks de Supabase en unit con msw o fachada `lib/supabase/*` inyectable.

## Handoff

```md
**From:** qa
**To:** security / merge
**Task:** Feature finalizeAppointment verificada
**Result:** 12 unit + 3 component + 2 E2E verdes; cobertura schemas 94%.
**Not found:** edge "finalizar dos veces" cubierto (idempotente).
**Risks:** E2E de USD depende de seed con exchange_rate fija; si cambia settings, actualizar fixture.
```
