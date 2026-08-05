import { api } from '@/lib/api';

export interface CalendarStatus {
  connected: boolean;
  calendarAuthorized: boolean;
  channelId: string | null;
  email: string | null;
  scopes: string[];
  needsReauthForCalendar: boolean;
  note?: string;
}

export interface GoogleCalendarRef {
  id: string;
  summary: string;
  backgroundColor: string;
  foregroundColor: string;
  primary?: boolean;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  htmlLink: string | null;
  meetLink: string | null;
  start: string | null;
  end: string | null;
  allDay: boolean;
  attendees: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  status?: string;
  colorId?: string | null;
  backgroundColor?: string;
  foregroundColor?: string;
  calendarId?: string;
  calendarSummary?: string;
  eventId?: string;
}

export const calendarService = {
  async status(): Promise<CalendarStatus> {
    const { data } = await api.get('/calendar/status');
    return data.data ?? data;
  },

  async calendars(channelId?: string): Promise<{
    channelId: string;
    calendars: GoogleCalendarRef[];
  }> {
    const { data } = await api.get('/calendar/calendars', {
      params: { channelId },
    });
    return data.data ?? data;
  },

  async events(opts?: {
    channelId?: string;
    from?: string;
    to?: string;
  }): Promise<{
    channelId: string;
    events: CalendarEvent[];
    calendars?: GoogleCalendarRef[];
  }> {
    const { data } = await api.get('/calendar/events', { params: opts });
    return data.data ?? data;
  },

  async create(input: {
    channelId?: string;
    calendarId?: string;
    summary: string;
    description?: string;
    startIso: string;
    endIso: string;
    attendeeEmails?: string[];
    withMeet?: boolean;
    timeZone?: string;
  }): Promise<{
    success: boolean;
    id: string;
    compositeId?: string;
    calendarId?: string;
    htmlLink: string | null;
    meetLink: string | null;
    note?: string;
  }> {
    const { data } = await api.post('/calendar/events', input);
    return data.data ?? data;
  },

  async update(
    eventId: string,
    input: {
      channelId?: string;
      calendarId: string;
      summary?: string;
      description?: string;
      startIso?: string;
      endIso?: string;
      attendeeEmails?: string[];
      withMeet?: boolean;
      timeZone?: string;
    },
  ): Promise<{
    success: boolean;
    id: string;
    htmlLink: string | null;
    meetLink: string | null;
  }> {
    const { data } = await api.patch(
      `/calendar/events/${encodeURIComponent(eventId)}`,
      input,
    );
    return data.data ?? data;
  },

  async remove(input: {
    eventId: string;
    calendarId: string;
    channelId?: string;
    notify?: boolean;
  }): Promise<{ success: boolean }> {
    const { data } = await api.delete(
      `/calendar/events/${encodeURIComponent(input.eventId)}`,
      {
        params: {
          calendarId: input.calendarId,
          channelId: input.channelId,
          notify: input.notify === false ? '0' : '1',
        },
      },
    );
    return data.data ?? data;
  },
};
