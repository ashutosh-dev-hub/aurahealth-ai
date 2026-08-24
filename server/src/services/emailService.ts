import nodemailer from 'nodemailer';
import { ENV } from '../config/env.js';
import { prisma } from '../config/prisma.js';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  if (ENV.SMTP_USER && ENV.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_PORT === 465,
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
    });
  } else {
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('📧 Ethereal test mail transporter initialized. Test user:', testAccount.user);
    } catch (e) {
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      } as any);
      console.log('📧 Stream/Mock mail transport active.');
    }
  }

  return transporter as nodemailer.Transporter;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  type: 'BOOKING_CONFIRMATION' | 'REMINDER' | 'CANCELLATION' | 'LEAVE_CONFLICT' | 'MEDICATION';
  icsContent?: string;
  icsFilename?: string;
}

/**
 * Dispatch an email notification and log to database for audit & background retries.
 */
export async function sendNotificationEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const mailer = await getTransporter();

    const mailOptions: nodemailer.SendMailOptions = {
      from: ENV.SMTP_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    };

    if (payload.icsContent) {
      mailOptions.attachments = [
        {
          filename: payload.icsFilename || 'appointment.ics',
          content: payload.icsContent,
          contentType: 'text/calendar; charset=utf-8; method=REQUEST',
        },
      ];
    }

    const info = await mailer.sendMail(mailOptions);

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`✉️ Email Preview URL [${payload.type} to ${payload.to}]: ${previewUrl}`);
    }

    // Record success in notification log
    await prisma.notificationLog.create({
      data: {
        recipientEmail: payload.to,
        type: payload.type,
        title: payload.subject,
        message: payload.html.slice(0, 1000),
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`❌ Failed to send email to ${payload.to}:`, error.message);

    // Record failure in notification log for background retry worker
    await prisma.notificationLog.create({
      data: {
        recipientEmail: payload.to,
        type: payload.type,
        title: payload.subject,
        message: payload.html.slice(0, 1000),
        status: 'FAILED',
        retryCount: 1,
      },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Helper template: Booking Confirmation
 */
export function getBookingEmailTemplate(params: {
  patientName: string;
  doctorName: string;
  specialization: string;
  dateTime: string;
  urgencyLevel: string;
  meetingLink?: string;
  portalUrl: string;
}) {
  const urgencyColor =
    params.urgencyLevel === 'HIGH' ? '#dc2626' : params.urgencyLevel === 'MEDIUM' ? '#d97706' : '#16a34a';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0284c7; margin: 0; font-size: 24px;">AuraHealth AI</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Smart Healthcare Appointment Manager</p>
      </div>

      <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #0284c7;">
        <h2 style="color: #0369a1; font-size: 18px; margin: 0 0 8px 0;">Appointment Confirmed!</h2>
        <p style="margin: 0; color: #334155; font-size: 15px;">Hello <strong>${params.patientName}</strong>, your appointment with <strong>Dr. ${params.doctorName}</strong> has been secured.</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Specialization:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 14px;">${params.specialization}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date & Time:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-size: 14px;">${params.dateTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">AI Triage Urgency:</td>
          <td style="padding: 8px 0;">
            <span style="background: ${urgencyColor}15; color: ${urgencyColor}; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 12px; border: 1px solid ${urgencyColor}40;">
              ${params.urgencyLevel}
            </span>
          </td>
        </tr>
        ${
          params.meetingLink
            ? `<tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Consultation Link:</td>
                <td style="padding: 8px 0;"><a href="${params.meetingLink}" style="color: #0284c7; text-decoration: none; font-weight: 600;">Join Telehealth Session</a></td>
              </tr>`
            : ''
        }
      </table>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${params.portalUrl}" style="background: #0284c7; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
          View Appointment in Portal
        </a>
      </div>

      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        AuraHealth AI Platform &bull; Automated Follow-up System
      </p>
    </div>
  `;
}

/**
 * Helper template: Leave Conflict Notification
 */
export function getLeaveConflictEmailTemplate(params: {
  patientName: string;
  doctorName: string;
  appointmentDateTime: string;
  reason?: string;
  rescheduleUrl: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #ea580c; margin: 0; font-size: 24px;">AuraHealth AI - Urgent Update</h1>
      </div>

      <div style="background: #fff7ed; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ea580c;">
        <h2 style="color: #c2410c; font-size: 18px; margin: 0 0 8px 0;">Doctor Schedule Update Required</h2>
        <p style="margin: 0; color: #334155; font-size: 15px;">Hello <strong>${params.patientName}</strong>, Dr. <strong>${params.doctorName}</strong> is unavailable due to planned leave on <strong>${params.appointmentDateTime}</strong>.</p>
      </div>

      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        ${params.reason ? `<strong>Reason:</strong> ${params.reason}<br/>` : ''}
        We apologize for this inconvenience. Your health is our priority, and you have been granted priority access to reschedule at any available time slot or with an alternative specialist.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${params.rescheduleUrl}" style="background: #ea580c; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
          Reschedule Appointment Now
        </a>
      </div>
    </div>
  `;
}

/**
 * Helper template: Medication Reminder
 */
export function getMedicationReminderEmailTemplate(params: {
  patientName: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  portalUrl: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #bbf7d0; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #16a34a; margin: 0; font-size: 24px;">AuraHealth &bull; Medication Reminder</h1>
      </div>

      <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #16a34a;">
        <p style="margin: 0; color: #166534; font-size: 16px; font-weight: 600;">Time for your scheduled dose, ${params.patientName}!</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Medication:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${params.medicineName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Dosage:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${params.dosage}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Frequency:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${params.frequency}</td>
        </tr>
      </table>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.portalUrl}" style="background: #16a34a; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
          Mark Dose Taken
        </a>
      </div>
    </div>
  `;
}
