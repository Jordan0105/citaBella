# permissions.md — Matriz de permisos

> Fuente canónica de acceso por rol. Refuerzo en dos capas: **RLS (Postgres)**
> es la barrera real; el middleware y la UI son conveniencia. Dueño: **security**.

## Roles

| Rol            | Definición                                                                   |
| -------------- | ---------------------------------------------------------------------------- |
| `owner`        | Dueña del salón. Acceso total.                                               |
| `worker`       | Trabajadora. Solo su operación: sus citas, sus ganancias, sus clientes.      |
| `receptionist` | Recepcionista. Gestión de agenda y clientes. **Sin ningún dato financiero.** |

---

## Matriz por módulo

### Dashboard

| Funcionalidad               | owner | worker      | receptionist |
| --------------------------- | ----- | ----------- | ------------ |
| Citas de hoy (todas)        | ✓     | solo suyas  | ✓            |
| Total vendido hoy/mes       | ✓     | —           | —            |
| Servicios más vendidos      | ✓     | —           | —            |
| Rendimiento por trabajadora | ✓     | solo propio | —            |
| Próximas citas              | ✓     | solo suyas  | ✓            |

### Calendario / Citas

| Acción                         | owner | worker                            | receptionist           |
| ------------------------------ | ----- | --------------------------------- | ---------------------- |
| Ver calendario completo        | ✓     | solo su agenda                    | ✓                      |
| Crear cita                     | ✓     | — (roadmap: auto-agenda)          | ✓                      |
| Editar / reprogramar           | ✓     | solo suyas (pendiente/confirmada) | pendiente/confirmada   |
| Confirmar cita                 | ✓     | solo suyas                        | ✓                      |
| Iniciar (en proceso)           | ✓     | solo suyas                        | —                      |
| **Finalizar (Cita realizada)** | ✓     | solo suyas                        | —                      |
| Cancelar                       | ✓     | solo suyas                        | pendiente/confirmada   |
| Ver precio de la cita          | ✓     | solo propio                       | ✓ (agenda lo necesita) |

### Clientes

| Acción                    | owner | worker                          | receptionist |
| ------------------------- | ----- | ------------------------------- | ------------ |
| Ver lista/detalle         | ✓     | solo clientes con citas propias | ✓            |
| Crear / editar            | ✓     | —                               | ✓            |
| Ver historial de citas    | ✓     | solo citas propias              | ✓            |
| Soft delete / reactivar   | ✓     | —                               | —            |
| Exportar base de clientes | ✓     | —                               | —            |

### Trabajadoras (employees)

| Acción                      | owner | worker                           | receptionist |
| --------------------------- | ----- | -------------------------------- | ------------ |
| Ver (para agenda)           | ✓     | ✓ (nombres/color)                | ✓            |
| Ver comisión % de alguien   | ✓     | solo propio                      | —            |
| Crear / editar / desactivar | ✓     | —                                | —            |
| Editar disponibilidad       | ✓     | propio (roadmap, con aprobación) | —            |

### Servicios

| Acción                           | owner | worker | receptionist |
| -------------------------------- | ----- | ------ | ------------ |
| Ver catálogo (precios incluidos) | ✓     | ✓      | ✓            |
| Crear / editar / desactivar      | ✓     | —      | —            |
| Editar precio/comisión           | ✓     | —      | —            |

### Caja / Finanzas

| Acción                              | owner | worker | receptionist |
| ----------------------------------- | ----- | ------ | ------------ |
| Ver ingresos / pagos                | ✓     | —      | —            |
| Ver comisiones (todas)              | ✓     | —      | —            |
| Ver comisiones propias              | —     | ✓      | —            |
| Registrar gasto / ver gastos        | ✓     | —      | solo lectura |
| Registrar ingreso directo / propina | ✓     | —      | —            |
| Cierre de caja                      | ✓     | —      | —            |

### Reportes

| Reporte                                                | owner | worker | receptionist |
| ------------------------------------------------------ | ----- | ------ | ------------ |
| Diario / semanal / mensual / anual (negocio)           | ✓     | —      | —            |
| Por trabajadora / servicio / método / moneda / cliente | ✓     | —      | —            |
| Dashboard financiero con gráficas                      | ✓     | —      | —            |
| Reporte personal (mis citas, mis comisiones)           | —     | ✓      | —            |
| Exportar PDF / Excel                                   | ✓     | propio | —            |

### Settings / Administración

| Acción                     | owner | worker | receptionist |
| -------------------------- | ----- | ------ | ------------ |
| Comisiones default (45/55) | ✓     | —      | —            |
| Tasa de cambio del día     | ✓     | —      | —            |
| Horario del salón          | ✓     | —      | —            |
| Datos del salón            | ✓     | —      | —            |
| Crear usuarios / roles     | ✓     | —      | —            |
| Bloqueos de agenda (salón) | ✓     | —      | ver          |

---

## Implementación (referencia)

1. **RLS** — la barrera real. Ver tabla completa de políticas en
   `docs/database-schema.md` §RLS. Reglas clave:
   - `payments`, `commissions`, `expenses`: receptionist **sin policies de
     select** → no existen para su JWT.
   - `worker` filtra por `employee_id = fn_current_employee_id()`.
2. **Middleware** — gating grueso: `/finance`, `/reports`, `/settings`
   requieren owner; sin sesión → `/login`.
3. **Server actions** — check de rol con `getAuthContext()` antes de operar.
4. **UI** — oculta lo que el rol no usa (bottom-nav/sidebar por rol); la UI
   nunca es el control.

## Cambios de permisos

- Todo cambio de esta matriz requiere: policy RLS nueva + test por los 3 roles
  - actualización de este documento + aprobación del agente security.
- Si un endpoint/filtra en UI pero RLS no lo respalda: es un bug de seguridad
  (bloqueante).
