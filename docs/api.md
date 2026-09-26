# api.md — Contrato de API interna (Server Actions)

> CitaBella no expone REST interno: **toda escritura es una Server Action** y
> las lecturas van por `queries/` (server) o `queryOptions` (cliente).
> Este documento define el contrato por dominio. Dueño: **backend**.

---

## Convenciones

- Firma: `action(input: Input): Promise<ActionResult<DTO>>`.
- `ActionResult<T>` = `{ ok: true, data: T } | { ok: false, error: { code, message, fields? } }`.
- Códigos: `VALIDATION` · `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` ·
  `CONFLICT` · `SLOT_TAKEN` · `OUT_OF_SCHEDULE` · `RATE_LIMITED` · `DB_ERROR`.
- Todos los inputs se validan con Zod **en el servidor**.
- La autorización real es RLS + check de rol en la action.

---

## auth

```ts
signIn(input: { email: string; password: string }): Promise<ActionResult<null>>
//    redirect a /dashboard en éxito; error genérico en credenciales inválidas
signOut(): Promise<void>
resetPassword(email: string): Promise<ActionResult<null>>          // email con link
updatePassword(input: { current: string; next: string }): Promise<ActionResult<null>>
createUser(input: { email; fullName; role: UserRole; employeeId? }): Promise<ActionResult<UserDTO>>  // owner
updateUserRole(userId: string; role: UserRole): Promise<ActionResult<UserDTO>>                        // owner
setUserActive(userId: string; isActive: boolean): Promise<ActionResult<UserDTO>>                      // owner
```

Lecturas: `getAuthContext(): Promise<AuthContext | null>` (id, role,
employeeId, fullName, isActive).

## appointments

```ts
createAppointment(input: CreateAppointmentInput): Promise<ActionResult<AppointmentDTO>>
//    Input: clientId, employeeId, serviceId, services?[], startsAt (ISO), endsAt,
//           currency: "NIO"|"USD", price, discount, notes?
//    SLOT_TAKEN si conflicto; OUT_OF_SCHEDULE si horario/bloqueo.
rescheduleAppointment(id: string; startsAt: string; endsAt: string): Promise<ActionResult<AppointmentDTO>>
updateAppointment(input: UpdateAppointmentInput): Promise<ActionResult<AppointmentDTO>>
updateAppointmentStatus(id: string; status: AppointmentStatus): Promise<ActionResult<AppointmentDTO>>
//    transiciones válidas: pending→confirmed→in_progress→completed; ×→cancelled
finalizeAppointment(id: string): Promise<ActionResult<ReceiptDTO>>
//    owner/worker propio. Genera payments + commissions (snapshot). Idempotente.
cancelAppointment(id: string; reason: string): Promise<ActionResult<AppointmentDTO>>
```

DTO principal:

```ts
type AppointmentDTO = {
  id: string;
  clientId: string;
  clientName: string;
  employeeId: string;
  employeeName: string;
  employeeColor: string;
  services: {
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
  }[];
  startsAt: string;
  endsAt: string;
  actualEndAt?: string;
  completedAt?: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  currency: "NIO" | "USD";
  price: number;
  discount: number;
  notes?: string;
};
```

Lecturas: `useAppointmentsInRange(from, to)`, `useClientHistory(clientId)`,
`getTodayAppointments()`.

## clients

```ts
createClient(input: CreateClientInput): Promise<ActionResult<ClientDTO>>   // todos los roles excepto worker
updateClient(id: string; input: UpdateClientInput): Promise<ActionResult<ClientDTO>>
deactivateClient(id: string): Promise<ActionResult<ClientDTO>>             // owner (soft delete)
reactivateClient(id: string): Promise<ActionResult<ClientDTO>>             // owner
```

`CreateClientInput`: fullName, phone (NIC), whatsapp?, email?, birthDate?, notes?.
Lecturas: `getClients({ search?, page? })`, `getClient(id)` + historial.

## employees

```ts
createEmployee(input: CreateEmployeeInput): Promise<ActionResult<EmployeeDTO>>   // owner
updateEmployee(id: string; input: UpdateEmployeeInput): Promise<ActionResult<EmployeeDTO>>  // owner
deactivateEmployee(id: string): Promise<ActionResult<EmployeeDTO>>               // owner
setAvailability(employeeId: string; slots: AvailabilitySlot[]): Promise<ActionResult<null>>  // owner
blockDates(input: { employeeId?: string; dates: string[]; reason?: string }): Promise<ActionResult<null>>  // owner
```

`EmployeeDTO`: id, fullName, specialty, color, commissionPct (number|null),
phone, isActive.

## services

```ts
createService(input: CreateServiceInput): Promise<ActionResult<ServiceDTO>>   // owner
updateService(id: string; input: UpdateServiceInput): Promise<ActionResult<ServiceDTO>>  // owner
deactivateService(id: string): Promise<ActionResult<ServiceDTO>>              // owner
```

`CreateServiceInput`: name, description?, priceNio, priceUsd,
durationMinutes, commissionPct?.
Lecturas: `useServices()` (catálogo activo, cache 5min).

## payments (owner)

```ts
registerDirectIncome(input: { description?; amount; currency; method; tip?; paidAt? }): Promise<ActionResult<PaymentDTO>>
//    ingreso directo (sin cita). Los ingresos de cita los genera finalizeAppointment.
```

Lecturas: `useCashClose(day)`, `usePayments({ from, to, method? })`.
`payments` es inmutable: no existen actions update/delete.

## expenses

```ts
createExpense(input: { description; amount; currency; method; category; spentAt? }): Promise<ActionResult<ExpenseDTO>>  // owner
updateExpense(id: string; input: UpdateExpenseInput): Promise<ActionResult<ExpenseDTO>>  // owner
```

## commissions

Sin acciones de escritura directa: se generan en `finalizeAppointment`.

```ts
adjustCommission(appointmentId: string; reason: string): Promise<ActionResult<AdjustmentDTO>>  // owner; movimientos de ajuste
```

Lecturas: `useCommissions({ from, to })` (owner), `useMyCommissions({ from, to })` (worker).

## reports (owner)

```ts
getReport(kind: "daily"|"weekly"|"monthly"|"yearly"; range: { from: string; to: string }): Promise<ReportDTO>
//    ReportDTO: revenueByCurrency, commissions, expenses, breakdowns:
//    byEmployee, byService, byPaymentMethod, byCurrency, byClient
exportReportToExcel(kind; range): Promise<{ fileBase64: string; filename: string }>
```

Lecturas de dashboard: `getDashboardKPIs()`, `getTodayRevenue()`,
`getTopServices()`, `getNextAppointments()`.

## settings (owner)

```ts
updateSetting(key: string; value: Json): Promise<ActionResult<null>>
//    claves permitidas: default_commission_owner, default_commission_worker,
//    exchange_rate, salon_info, business_hours, default_currency
```

Lecturas: `useSettings()` (público para roles: defaults y monedas; salon_info
editable solo owner).

## notifications

```ts
sendWhatsAppReminder(input: { appointmentId: string }): Promise<ActionResult<{ providerMessageId: string; mock: boolean }>>
//    owner o trabajadora asignada. Requiere teléfono del cliente.
//    Modo mock por defecto; modo meta con WHATSAPP_PROVIDER=meta + token.
markAllNotificationsRead(): Promise<ActionResult<null>>
//    marca como leídas todas las notificaciones in-app del usuario.
```

Lecturas: `notificationsOptions()` (cliente, polling 60s).

---

## Webhooks / cron (única excepción en `app/api/`)

| Ruta                          | Uso                                                      | Protección                           |
| ----------------------------- | -------------------------------------------------------- | ------------------------------------ |
| `POST /api/cron/reminders`    | recordatorios de citas del día siguiente → notifications | `Authorization: Bearer CRON_SECRET`  |
| `POST /api/webhooks/whatsapp` | estados de entrega de WhatsApp (Meta)                    | firma HMAC con `WHATSAPP_APP_SECRET` |
| `GET /api/webhooks/whatsapp`  | verificación del webhook de Meta                         | `WHATSAPP_WEBHOOK_VERIFY_TOKEN`      |

Estas rutas no exponen CRUD; disparan procesos internos con service role
(server only) y validan su propio secreto.
