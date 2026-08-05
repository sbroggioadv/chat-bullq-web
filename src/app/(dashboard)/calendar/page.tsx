'use client';

import { CalendarWorkspace } from '@/features/calendar/components/calendar-workspace';

export default function CalendarPage() {
  return (
    <div className="h-[calc(100vh-0px)] min-h-0 w-full">
      <CalendarWorkspace />
    </div>
  );
}
