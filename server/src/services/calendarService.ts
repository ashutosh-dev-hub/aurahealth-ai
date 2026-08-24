import { google } from 'googleapis';
import { ENV } from '../config/env.js';

export interface CalendarEventDetails {
  summary: string;
  description: string;
  location?: string;
  startDateTime: Date;
  endDateTime: Date;
  attendeeEmails?: string[];
}

/**
 * Generates RFC 5545 standard .ics calendar invite string.
 */
export function generateIcsString(details: {
  uid: string;
  summary: string;
  description: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  organizerEmail?: string;
  organizerName?: string;
}): string {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AuraHealth AI//Appointment Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${details.uid}@aurahealth.ai`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(details.startTime)}`,
    `DTEND:${formatDate(details.endTime)}`,
    `SUMMARY:${details.summary}`,
    `DESCRIPTION:${details.description.replace(/\n/g, '\\n')}`,
    details.location ? `LOCATION:${details.location}` : '',
    details.organizerEmail
      ? `ORGANIZER;CN=${details.organizerName || 'AuraHealth AI'}:mailto:${details.organizerEmail}`
      : 'ORGANIZER;CN=AuraHealth AI:mailto:appointments@aurahealth.ai',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/**
 * Creates Google Calendar OAuth client if credentials exist.
 */
function getOAuth2Client(refreshToken?: string) {
  if (!ENV.GOOGLE_CLIENT_ID || !ENV.GOOGLE_CLIENT_SECRET) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    ENV.GOOGLE_CLIENT_ID,
    ENV.GOOGLE_CLIENT_SECRET,
    ENV.GOOGLE_REDIRECT_URI
  );

  if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  return oauth2Client;
}

/**
 * Creates a Google Calendar Event if OAuth credentials available.
 */
export async function createGoogleCalendarEvent(
  details: CalendarEventDetails,
  userRefreshToken?: string
): Promise<{ eventId?: string; meetingLink?: string; error?: string }> {
  try {
    const auth = getOAuth2Client(userRefreshToken);
    if (!auth) {
      return { meetingLink: `https://meet.jit.si/AuraHealth-${Math.random().toString(36).substring(2, 9)}` };
    }

    const calendar = google.calendar({ version: 'v3', auth });

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: details.summary,
        description: details.description,
        location: details.location,
        start: { dateTime: details.startDateTime.toISOString() },
        end: { dateTime: details.endDateTime.toISOString() },
        attendees: details.attendeeEmails?.map(email => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `aura-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
      conferenceDataVersion: 1,
    });

    return {
      eventId: event.data.id || undefined,
      meetingLink: event.data.hangoutLink || undefined,
    };
  } catch (error: any) {
    console.warn('Google Calendar API creation skipped / error:', error.message);
    return { meetingLink: `https://meet.jit.si/AuraHealth-${Math.random().toString(36).substring(2, 9)}` };
  }
}

/**
 * Deletes or cancels a Google Calendar Event.
 */
export async function deleteGoogleCalendarEvent(
  eventId: string,
  userRefreshToken?: string
): Promise<boolean> {
  try {
    const auth = getOAuth2Client(userRefreshToken);
    if (!auth || !eventId) return false;

    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
    return true;
  } catch (err: any) {
    console.warn('Google Calendar delete error:', err.message);
    return false;
  }
}
