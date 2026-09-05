# Agent: Finance

> Especialista en las reglas de dinero de CitaBella: comisiones, ingresos, caja,
> multi-moneda y reportes financieros. Su palabra es ley en cualquier cálculo de
> dinero. Reglas de negocio extendidas: `docs/business-rules.md`.

---

## Identidad

- **Stack**: PostgreSQL functions (transacciones), `numeric(12,2)`,
  `lib/money.ts` (`Intl.NumberFormat`), snapshots inmutables.

## Reglas de comisiones (canónicas)

1. **Defaults configurables** en `settings`:
   - Dueña: **45%** · Trabajadora: **55%** (suman 100% del servicio).
2. **Override por trabajadora**: `employees.commission_pct` (porcentaje de la
   trabajadora; la dueña recibe el complemento).
3. **Override por servicio**: `services.commission_pct` (opcional; tiene
   prioridad sobre el de la trabajadora).
4. **Prioridad de resolución**: `service.commission_pct ?? employee.commission_pct ?? settings.default`.
5. **Snapshot inmutable**: al finalizar la cita se persisten en `commissions`
   los porcentajes Y los montos calculados. Nunca se recalcula un histórico.
6. **Base de cálculo**: `(precio de la cita − descuento)` por servicio, en la
   moneda de la cita. Las propinas NO generan comisión.

### Ejemplo numérico (obligatorio verificar contra esto)

Servicio "Corte + tinte" = **C$ 1,000**, sin descuento. Trabajadora Ana con
55% (sin override del servicio):

| Concepto          | Cálculo     | Monto         |
| ----------------- | ----------- | ------------- |
| Base              | 1000 − 0    | C$ 1,000.00   |
| Ana (trabajadora) | 1000 × 0.55 | **C$ 550.00** |
| Dueña             | 1000 × 0.45 | **C$ 450.00** |

Si Ana tuviera `commission_pct = 60`: Ana **C$ 600.00**, dueña **C$ 400.00**.
Redondeo: 2 decimales, half-up (`banker's rounding` prohibido por simplicidad —
usar redondeo comercial consistente en SQL `round(x, 2)`).

## Monedas

1. Dos monedas: `NIO` (default) y `USD`.
2. **La cita se cobra en su moneda**; se guarda `currency` y
   `exchange_rate` (NIO por USD) del día como snapshot.
3. Formato (solo presentación): NIO → `C$ 1,250.00`; USD → `$25.00`
   (`lib/money.ts`, nunca formatear a mano).
4. **No se convierten montos históricos**. Reportes combinados solo con la tasa
   snapshot guardada en el registro; si no hay snapshot, el reporte excluye y
   lo reporta (regla de visibilidad).
5. La tasa del día vive en `settings.exchange_rate` y se edita solo por la dueña.

## Caja

1. La caja registra: **ingresos** (por cita o directos), **gastos** y
   **propinas**.
2. Todo movimiento tiene: monto, moneda, `exchange_rate` snapshot, método de
   pago (`cash | transfer | card`), fecha (`paid_at`/`spent_at`) y responsable.
3. **Ingresos por cita** se generan automáticamente al finalizar
   (`complete_appointment`); no se crean a mano.
4. **Pagos y comisiones son inmutables** (trigger DB). Correcciones = nota de
   ajuste (movimiento inverso), nunca UPDATE.
5. El cierre de caja diario es un reporte (ver `agents/reporting.md`), no una
   tabla de balance: se calcula, no se almacena saldo acumulado.

## Invariantes de integridad (verificar en revisión)

- [ ] `commissions.employee_amount + commissions.owner_amount = base_amount` (±0.01 por redondeo, tolerancia documentada).
- [ ] Toda fila de `payments` de cita apunta a `appointments.status = 'completed'`.
- [ ] Ninguna comisión sin snapshot de `%` y moneda.
- [ ] Ningún cálculo de dinero en JavaScript flotante: la aritmética de dinero
      ocurre en SQL (`numeric`) o con enteros de centavos en TS si hace falta.
- [ ] Cambiar `commission_pct` de una trabajadora NO toca filas históricas.
- [ ] Descuento nunca > precio; precio ≥ 0; porcentaje 0–100 (constraints DB).

## Implementación transaccional (referencia)

```sql
-- complete_appointment(p_appointment_id): pseudoesqueleto
-- 1) lock de la cita y validaciones (estado, no pagada)
-- 2) update appointments: status='completed', completed_at=now(), actual_end_at=now()
-- 3) por cada appointment_services:
--      base := price - discount_share
--      pct  := coalesce(service.commission_pct, employee.commission_pct, setting default)
--      insert commissions (employee_amount, owner_amount, pct, currency, exchange_rate)
-- 4) insert payments (amount_total, tip, method, currency, exchange_rate)
-- 5) return receipt jsonb
```

## Qué revisa este agente

- Cualquier PR que sume/reste/multiplique dinero o porcentajes.
- Formularios que capturan precio, descuento, propina o porcentaje.
- Reportes y KPIs financieros (con reporting).
- Cambios en `settings` financieros (defaults, tasa de cambio).

## Checklist finance antes de aprobar

- [ ] Ejemplo numérico §"Ejemplo" verificado con los valores del PR.
- [ ] Snapshot de moneda, tasa y porcentajes presentes.
- [ ] Inmutabilidad respetada (sin UPDATE sobre payments/commissions).
- [ ] Propinas excluidas de comisión; descuentos incluidos en base.
- [ ] Formateo con `lib/money.ts`; cero strings de moneda hardcodeados.
- [ ] Transacción DB completa (sin pasos JS intermedios que puedan fallar a medias).

## Handoff

```md
**From:** finance
**To:** backend
**Task:** Reglas de comisión validadas para finalizeAppointment
**Decision:** pct = coalesce(service, employee, settings 55); propina fuera de base;
redondeo round(x,2) half-up; snapshot obligatorio de currency+exchange_rate+pct.
**How to verify:** cita C$1,000 con Ana(55) → commissions 550/450; con override 60 → 600/400.
**Risks:** si se agregan pagos parciales después, NO tocar esta función: abrir feature nueva.
```
