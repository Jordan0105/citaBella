"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import esLocale from "@fullcalendar/react/locales/es";
import type { EventDisplayInfo } from "@fullcalendar/react";
import { Check } from "lucide-react";
import { STATUS_COLORS, type AppointmentDTO } from "../types";

export interface CalendarInnerProps {
  appointments: AppointmentDTO[];
  onDateSelect: (startISO: string, endISO: string) => void;
  onEventClick: (appointment: AppointmentDTO) => void;
  onEventDrop: (
    appointment: AppointmentDTO,
    startISO: string,
    endISO: string,
  ) => void;
  onRangeChange: (fromISO: string, toISO: string) => void;
}

/**
 * FullCalendar solo en el navegador (se carga con next/dynamic ssr:false).
 * Colores por estado (canónicos en types.ts) + borde con el color de la
 * trabajadora. "Cita realizada" lleva check y opacidad; cancelada va tachada.
 */
export default function CalendarInner({
  appointments,
  onDateSelect,
  onEventClick,
  onEventDrop,
  onRangeChange,
}: CalendarInnerProps) {
  const events = appointments.map((a) => {
    const colors = STATUS_COLORS[a.status];
    return {
      id: a.id,
      title: `${a.clientName} · ${a.services[0]?.serviceName ?? "Cita"}`,
      start: a.startsAt,
      end: a.endsAt,
      backgroundColor: colors.bg,
      textColor: colors.text,
      borderColor: a.employeeColor,
      extendedProps: { appointment: a },
    };
  });

  return (
    <FullCalendar
      locale={esLocale}
      timeZone="America/Managua"
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="timeGridDay"
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "timeGridDay,timeGridWeek,dayGridMonth",
      }}
      height="auto"
      allDaySlot={false}
      slotMinTime="07:00:00"
      slotMaxTime="20:00:00"
      nowIndicator
      selectable
      selectMirror
      editable
      eventResizableFromStart={false}
      events={events}
      select={(arg) => onDateSelect(arg.startStr, arg.endStr)}
      eventClick={(arg) => {
        const a = arg.event.extendedProps.appointment as AppointmentDTO;
        onEventClick(a);
      }}
      eventDrop={(arg) => {
        const a = arg.event.extendedProps.appointment as AppointmentDTO;
        if (a.status === "completed" || a.status === "cancelled") {
          arg.revert();
          return;
        }
        onEventDrop(a, arg.event.startStr, arg.event.endStr);
      }}
      eventContent={renderEventContent}
      eventClass={(arg: EventDisplayInfo) => {
        const a = appointmentFrom(arg);
        if (!a) return "";
        if (a.status === "completed") return "opacity-75";
        if (a.status === "cancelled") return "opacity-50 line-through";
        return "";
      }}
      datesSet={(arg) => onRangeChange(arg.startStr, arg.endStr)}
    />
  );
}

function appointmentFrom(arg: EventDisplayInfo): AppointmentDTO | null {
  return (
    (arg.event.extendedProps as { appointment?: AppointmentDTO }).appointment ??
    null
  );
}

function renderEventContent(arg: EventDisplayInfo) {
  const a = appointmentFrom(arg);
  if (!a) return true;
  return (
    <div className="flex items-center gap-1 overflow-hidden px-0.5 text-[11px] leading-tight">
      {a.status === "completed" && (
        <Check className="h-3 w-3 shrink-0" aria-hidden />
      )}
      <span className="truncate font-medium">{arg.timeText}</span>
      <span className="truncate">{arg.event.title}</span>
    </div>
  );
}
