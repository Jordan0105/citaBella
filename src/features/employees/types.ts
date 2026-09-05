export interface EmployeeDTO {
  id: string;
  fullName: string;
  specialty: string | null;
  color: string;
  commissionPct: number | null;
  phone: string | null;
  isActive: boolean;
}

export interface AvailabilitySlotDTO {
  weekday: number;
  startTime: string;
  endTime: string;
}
