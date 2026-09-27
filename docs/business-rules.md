# business-rules.md — Reglas de negocio

> Fuente canónica de las reglas del negocio. Dueños: **finance** (dinero) y
> **architect** (agenda). Todo cambio de regla se refleja aquí en el mismo PR.

---

## 1. Agenda de citas

### Ciclo de vida (estados)

```
pending ──confirm──► confirmed ──start──► in_progress ──finish──► completed
   │                    │                    │
   └────────────────────┴────────────────────┴──cancel──► cancelled
```

- Solo `pending` y `confirmed` aceptan cancelación (con motivo).
- `completed` y `cancelled` son terminales (no se editan).
- Al pasar a `completed` ("**Cita realizada**"): se registra `completed_at` y
  `actual_end_at`, se genera el ingreso (`payments`) y las comisiones
  (`commissions`) en una transacción. Visualmente distinta en calendario
  (verde salvia, check, opacidad).
- **Confirmación/cancelación por WhatsApp**: el cliente responde al recordatorio
  con palabras clave (`sí`, `confirmo`, `no`, `cancelo`, `reprogramar`, etc.).
  El webhook actualiza el estado de la cita siguiente (la más cercana en el
  futuro) y registra la respuesta en `whatsapp_messages`. La cancelación vía
  WhatsApp guarda el texto recibido en `notes` como motivo.

### Conflictos y disponibilidad (validación en DB, siempre)

1. **No doble cita**: una trabajadora no puede tener dos citas activas
   (`pending/confirmed/in_progress`) que se solapen en tiempo.
2. **Citas contiguas permitidas**: fin de una = inicio de otra (no es conflicto).
3. **No citas fuera de horario laboral**: dentro de `availability` de la
   trabajadora (o del salón si no tiene horario propio).
4. **Días bloqueados**: no hay citas en `blocked_dates` de la trabajadora ni
   del salón (vacaciones, feriados, capacitaciones).
5. Todas las validaciones ocurren en `create_appointment_safe` /
   `reschedule_appointment` (transaccionales). El formulario solo pre-valida
   para UX.

### Reglas de edición

- Reprogramar (drag & drop o form) revalida todo (conflicto, horario, bloqueos).
- Cambiar trabajadora, servicio o precio permitido solo antes de `in_progress`.
- Precio editable al momento de crear/editar (respeta default del servicio);
  descuento ≤ precio; moneda elegida al crear y no cambia después.

### Zona horaria

- Negocio opera en `America/Managua` (UTC−6, sin DST). Toda hora mostrada y
  todo corte de día/semana/mes usa esa tz, sin importar el dispositivo.

---

## 2. Trabajadoras y horarios

- Cada trabajadora define su semana laboral (`availability`: día, inicio, fin).
- Sin registro para un día = día libre.
- `blocked_dates` cubre: días libres puntuales, vacaciones, permisos.
- La dueña administra todo; la trabajadora ve (y en el roadmap edita) su
  disponibilidad con aprobación de la dueña.

---

## 3. Comisiones (dinero)

1. **Defaults configurables** (`settings`): dueña **45%**, trabajadora **55%**.
2. **Prioridad del porcentaje de la trabajadora**:
   `services.commission_pct ?? employees.commission_pct ?? settings.default_worker`.
   La dueña recibe el complemento (100 − pct).
3. **Base de cálculo**: `precio de la cita − descuento`, en la moneda de la
   cita. **Las propinas NO generan comisión.**
4. **Snapshot inmutable**: al finalizar se guardan porcentajes, montos,
   moneda y `exchange_rate`. Cambiar porcentajes después NO altera el histórico.
5. **Ejemplo de referencia** (obligatorio en todo test):

   | Escenario                | Base     | % Ana | Ana           | Dueña         |
   | ------------------------ | -------- | ----- | ------------- | ------------- |
   | Default                  | C$ 1,000 | 55%   | **C$ 550.00** | **C$ 450.00** |
   | Override trabajadora 60% | C$ 1,000 | 60%   | **C$ 600.00** | **C$ 400.00** |
   | Con descuento C$ 100     | C$ 900   | 55%   | **C$ 495.00** | **C$ 405.00** |

6. Redondeo: 2 decimales, half-up (`round(x,2)` en SQL). Diferencias de
   centavos por redondeo van siempre a la dueña (el complemento se calcula por
   resta, no por porcentaje).
7. Correcciones históricas: nunca UPDATE de `payments`/`commissions`
   (inmutables por trigger). Los ajustes se registran como filas nuevas
   referenciando la comisión original (owner only, auditadas). **Pendiente de
   modelar**: ver Fase 6 del roadmap (no implementado en el MVP; hoy un error
   de caja se corrige desde el cierre del día, no recargando la comisión).

---

## 4. Caja

- La caja registra: **ingresos** (auto por cita finalizada + directos),
  **gastos** (`expenses`) y **propinas** (campo de `payments`).
- Métodos de pago: `cash`, `transfer`, `card` (métodos separados de la moneda:
  una transferencia puede ser en NIO o USD).
- **Pagos inmutables**: error de captura → nota de ajuste (movimiento inverso).
- No existe "saldo de caja" persistido: el cierre es un **reporte calculado**
  (`v_cash_close`): ingresos − gastos por método y moneda, propinas aparte.
- Solo owner crea gastos y ve cierres; receptionist puede consultar gastos del
  día para conciliar efectivo (solo lectura).

---

## 5. Monedas

1. Monedas soportadas: **NIO** (default) y **USD**.
2. La moneda se elige **al crear la cita** y no cambia después.
3. Toda operación con dinero guarda su moneda + `exchange_rate` (NIO por USD)
   del día como **snapshot** (obtenida de `settings.exchange_rate`).
4. Nunca se recalculan montos históricos con tasas actuales.
5. Formatos de presentación (solo `lib/money.ts`):
   - NIO: `C$ 1,250.00` · USD: `$25.00`
6. Reportes: series por moneda separadas; totales combinados solo como
   referencia usando los snapshots, etiquetados "referencia".

---

## 6. Reportes

- Períodos: diario, semanal (lunes–domingo, ISO), mensual, anual — cortados en
  `America/Managua`.
- Desgloses: por trabajadora, servicio, método de pago, moneda, cliente.
- **Ingresos** cuentan solo citas `completed` (por `completed_at`).
- Canceladas: cuentan para tasa de cancelación, no restan ingresos.
- Definiciones exactas de KPIs: `agents/reporting.md` (fuente única).

---

## 7. Clientes

- Teléfono nicaragüense requerido: `+505` + 8 dígitos iniciando en 2, 7 u 8.
- WhatsApp opcional (puede diferir del teléfono).
- Cumpleaños: usado para saludos/segmentación (futuro); fecha pasada only.
- Historial de citas del cliente visible para owner/receptionist; la
  trabajadora ve el historial de SUS citas con ese cliente.
- Baja de cliente = soft delete (`is_active = false`); historial se conserva.
- **Fotos de servicios realizados**: cada cita puede llevar hasta 12 fotos
  (JPEG/PNG/WebP, máx. 5 MB) con descripción opcional. Las sube la dueña o la
  trabajadora asignada desde la ficha de la cita; se ven en el historial del
  cliente. En el historial la galería es de solo lectura: borrar una foto se
  hace desde la cita, donde se conoce el permiso exacto. Se guardan en el
  bucket privado `appointment-photos` de Supabase Storage.

---

## 8. Roles (resumen; matriz completa en `docs/permissions.md`)

- **owner**: acceso total (finanzas, reportes, settings, administración).
- **worker**: sus citas, sus ganancias (comisiones propias), sus clientes.
  No ve datos de otras trabajadoras ni totales del negocio.
- **receptionist**: gestiona citas y clientes. **Jamás ve montos**: ni
  pagos, ni comisiones, ni gastos, ni reportes financieros.

---

## 9. Auditoría

- Cambios en: usuarios, roles, comisiones %, servicios (precio/override),
  settings (tasa, defaults), ajustes de caja → `audit_logs` con actor,
  old_data, new_data y timestamp.
- La auditoría es inmutable y no visible para receptionist.
