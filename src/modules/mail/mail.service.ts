import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
    private resend: Resend;

    constructor() {
        this.resend = new Resend(process.env.RESEND_API_KEY);
    }

    async sendMail(to: string, subject: string, html: string) {
        try {
            const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
            const { data, error } = await this.resend.emails.send({
                from,
                to,
                subject,
                html,
            });

            if (error) {
                console.error('Error sending email via Resend:', error);
                return { success: false, error };
            }

            return { success: true, data };
        } catch (err) {
            console.error('Exception sending email via Resend:', err);
            return { success: false, error: err };
        }
    }

    async sendForgotPasswordEmail(to: string, token: string, origin: string) {
        const baseUrl = origin.endsWith('/') ? origin.slice(0, -1) : origin;
        const resetLink = `${baseUrl}/reset-password?token=${token}`;
        const subject = 'Recuperar contraseña - CRM AutoLote';
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 10px;">
        <h2 style="color: #2563eb; text-align: center;">Recuperación de Contraseña</h2>
        <p>Hola,</p>
        <p>Has solicitado restablecer tu contraseña para acceder al CRM AutoLote. Haz clic en el siguiente botón para continuar:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;"> Restablecer Contraseña </a>
        </div>
        <p>Si no has solicitado este cambio, puedes ignorar este correo de forma segura.</p>
        <p>Este enlace expirará en 1 hora.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666; text-align: center;">© 2024 CRM AutoLote - Sistema de Gestión Automotriz</p>
      </div>
    `;

        return this.sendMail(to, subject, html);
    }
}
