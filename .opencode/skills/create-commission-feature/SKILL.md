---
name: create-commission-feature
description: "Use when creating or modifying commission logic: commission_pct rules and overrides, immutable snapshots, complete_appointment RPC, settings defaults, commission metrics or report widgets, and historical adjustments (never recalculate). Must validate the rule with a numeric example before coding. Triggers: comisión, commission, commission_pct, override, snapshot, complete_appointment."
---

# Skill: create-commission-feature

> Receta paso a paso para crear o modificar lógica de comisiones. Dueños:
> **finance** (reglas) + **database** + **backend**. Lectura obligatoria
> ANTES de escribir código: `agents/finance.md` y `docs/business-rules.md` §Finanzas.

## Paso 0 — Confirmar la regla con finance

Antes de tocar código, escribir la regla en una línea y validarla:

```md
Regla propuesta: <qué se calcula, con qué base, qué prioridad de overrides,
redondeo, moneda, qué es inmutable>
Ejemplo verificado: C$1,000 · Ana 55% → 550/450 · con override 60% → 600/400
```

Reglas canónicas (no reinventar):

- Prioridad: `service.commission_pct ?? employee.commission_pct ?? settings.default`.
- Defaults settings: dueña 45% / trabajadora 55%.
- Base: precio − descuento. Propinas fuera de la base.
- Snapshot inmutable en `commissions` (porcentajes + montos + moneda + tasa).
- Redondeo: `round(x, 2)` half-up en SQL.

## Paso 1 — Cambio de REGLA (nuevo cálculo o defaults)

1. **Migración** (database): ajustar `settings` (nuevas claves), constraints o
   la función `complete_appointment` (o su sucesora). Nunca editar migraciones
   pasadas: nueva migración con `create or replace function`.
2. Si cambia el histórico: **prohibido recalcular**. Solo afecta a citas
   finalizadas a partir del deploy. Documentarlo en `docs/business-rules.md`.
3. Test SQL del ejemplo numérico §Paso 0 en `supabase db reset`.

```sql
-- test manual tras reset
begin;
  -- seed: Ana 55%, settings 45/55, servicio sin override
  select * from complete_appointment('<uuid-cita-1000-nio>');
  -- esperado: commissions → 550.00 / 450.00
rollback;
```

## Paso 2 — Cambio de OVERRIDE (por trabajadora o servicio)

1. UI (frontend): editar `employees.commission_pct` / `services.commission_pct`
   con `pctSchema` (0–100) en el form.
2. Action (backend): `updateEmployee` / `updateService` validan Zod y auditan
   (`audit_logs` con old/new — regla security).
3. DB: CHECK `between 0 and 100`; permitir `null` (= usar default).
4. Comunicar en UI: "Las citas ya finalizadas no cambian" (texto en el form).

## Paso 3 — Nueva MÉTRICA de comisiones (reporte/widget)

1. Agregación en SQL (view nueva o extensión) — patrón `create-report`.
2. Widget/KPI siguiendo `create-dashboard-widget`.
3. RLS: solo owner. Worker ve su propio total en su vista personal.

## Paso 4 — Corrección de un registro histórico (ajuste)

- Jamás UPDATE/DELETE sobre `commissions` (trigger lo bloquea).
- Crear action `adjustCommission(appointmentId, reason)`: owner only, inserta
  filas de ajuste (diferencias) referenciando la comisión original + nota en
  `audit_logs`. El reporte neto suma originales + ajustes.

## Paso 5 — Checklist de la feature de comisiones

- [ ] Regla validada con el ejemplo numérico de `agents/finance.md`.
- [ ] Cálculo 100% en SQL (transacción), cero aritmética de dinero en JS.
- [ ] Snapshot completo: pct empleado, pct dueña, montos, moneda, exchange_rate.
- [ ] Inmutabilidad respetada; ajustes como movimientos nuevos.
- [ ] `audit_logs` para cambios de porcentajes.
- [ ] Tests: unit del schema + test SQL del ejemplo + E2E de finalización.
- [ ] Docs: `docs/business-rules.md` actualizado si la regla cambió.
- [ ] QA con 3 roles: worker ve SOLO sus comisiones; receptionist nada.

## Handoff a finance para aprobación

```md
**From:** backend
**To:** finance
**Task:** Revisión de regla propuesta
**Regla:** propina opcional SÍ suma al ingreso pero NO a la base de comisión.
**Implementación:** complete_appointment v2: base := price - discount;
commissions de base; payments.amount := base + tip.
**Verificado:** base 1000 + tip 100 → commissions 550/450, payment 1100.
**Risk:** reportes existentes ya tratan tips aparte (compatible).
```
