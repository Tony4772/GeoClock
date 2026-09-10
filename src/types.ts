export type Role = 'admin' | 'employee';

export interface DaySchedule {
  isActive: boolean;
  start: string; // 'HH:mm'
  end: string;   // 'HH:mm'
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
  branchId: string;
  deviceModel?: string;
  schedule?: {
    start: string; // 'HH:mm'
    end: string;   // 'HH:mm'
  };
  weeklySchedule?: Record<string, DaySchedule>; // Keys '0' (Sun) to '6' (Sat)
}

export interface Tenant {
  id: string;
  name: string;
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface Punch {
  id: string;
  employeeId: string;
  tenantId: string;
  branchId: string;
  type: 'in' | 'out' | 'lunch_start' | 'lunch_end';
  timestamp: any; // Firestore Timestamp
  latitude: number;
  longitude: number;
  distance: number;
  status: 'valid' | 'invalid';
  scheduleSnapshot?: {
    start: string;
    end: string;
  };
}
