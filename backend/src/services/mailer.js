/**
 * Resend tabanlı e-posta bildirim servisi.
 *
 * Tasarım ilkeleri:
 *  - API anahtarı yoksa hiçbir şey patlamaz; gönderim sessizce atlanır.
 *  - Gönderim her zaman "fire-and-forget" çalışır (notifyAsync); bir e-posta
 *    hatası kullanıcının işlemini asla geri döndürmez.
 *  - Alıcılar tek tek gönderilir; böylece kullanıcılar birbirinin adresini görmez.
 *  - Her deneme email_logs tablosuna yazılır (denetim/teşhis için).
 */

const config = require('../config');
const { all, run } = require('../db');

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const isEnabled = () => Boolean(config.RESEND_API_KEY) && config.EMAIL_NOTIFICATIONS;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const TYPE_STYLES = {
  warning: { color: '#dc2626', label: 'Acil Bildirim', bg: '#fef2f2' },
  action: { color: '#2563eb', label: 'Görev Ataması', bg: '#eff6ff' },
  success: { color: '#16a34a', label: 'Tamamlandı', bg: '#f0fdf4' },
  info: { color: '#0ea5e9', label: 'Bilgilendirme', bg: '#f0f9ff' },
};

/** Bildirim için kurumsal görünümlü HTML + düz metin üretir. */
function renderNotificationEmail({ title, message, link = '', type = 'info', sender = 'PARSAN Portal' }) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.info;
  const safeTitle = escapeHtml(title);
  const safeSender = escapeHtml(sender);
  const bodyHtml = escapeHtml(message).replace(/\n/g, '<br />');
  const url = link ? `${config.APP_URL}/${link.replace(/^\/+/, '')}` : config.APP_URL;

  const html = `<!doctype html>
<html lang="tr">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.12);">
            <tr>
              <td style="background:#0f172a;padding:18px 24px;">
                <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:.5px;">PARSAN İşletme Portalı</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <span style="display:inline-block;background:${style.bg};color:${style.color};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;padding:4px 10px;border-radius:999px;">${escapeHtml(style.label)}</span>
                <h1 style="margin:14px 0 10px;font-size:19px;line-height:1.35;color:#0f172a;">${safeTitle}</h1>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155;">${bodyHtml}</p>
                <a href="${escapeHtml(url)}" style="display:inline-block;background:${style.color};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:11px 20px;border-radius:8px;">Portalı Aç</a>
                <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Bu e-posta ${safeSender} tarafından PARSAN İşletme Portalı üzerinden gönderilmiştir.
                  Bildirim tercihlerinizi portal üzerinden yönetebilirsiniz.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;padding:14px 24px;border-top:1px solid #e2e8f0;">
                <span style="font-size:11px;color:#94a3b8;">parsan.engrare.com · Otomatik bildirim</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `PARSAN İşletme Portalı — ${style.label}`,
    '',
    title,
    '',
    message,
    '',
    `Portal: ${url}`,
    '',
    `Bu e-posta ${sender} tarafından gönderilmiştir.`,
  ].join('\n');

  return { html, text };
}

/** Tek bir e-postayı Resend API'si üzerinden gönderir. */
async function sendEmail({ to, subject, html, text }) {
  const recipients = (Array.isArray(to) ? to : [to])
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  if (!recipients.length) return { ok: false, skipped: true, error: 'Alıcı bulunamadı' };
  if (!isEnabled()) return { ok: false, skipped: true, error: 'E-posta bildirimleri kapalı' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.RESEND_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.RESEND_FROM,
        to: recipients,
        subject,
        html,
        text,
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = data?.message || data?.error || `HTTP ${response.status}`;
      console.warn('[mail] Resend gönderim hatası:', response.status, error);
      return { ok: false, status: response.status, error };
    }

    return { ok: true, id: data?.id || null };
  } catch (err) {
    const error = err.name === 'AbortError' ? 'Resend isteği zaman aşımına uğradı' : err.message;
    console.warn('[mail] Gönderim hatası:', error);
    return { ok: false, error };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Bildirimin "ilgili kişilerini" çözer.
 * Aynı e-posta birden fazla kaynaktan gelse bile tek kez listelenir.
 */
async function resolveRecipients({
  userIds = [],
  names = [],
  department = '',
  roles = [],
  includeManagers = false,
  extraEmails = [],
  excludeUserIds = [],
} = {}) {
  const recipients = new Map();
  const excluded = new Set(excludeUserIds.map(Number).filter(Number.isFinite));

  const add = (row) => {
    if (!row?.email) return;
    if (excluded.has(Number(row.id))) return;
    const email = String(row.email).trim();
    if (!email) return;
    const key = email.toLowerCase();
    if (!recipients.has(key)) recipients.set(key, { email, name: row.name || '' });
  };

  const ids = userIds.map(Number).filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const rows = await all(`SELECT id, name, email FROM users WHERE id IN (${placeholders})`, ids);
    rows.forEach(add);
  }

  const cleanNames = names.map((n) => String(n || '').trim()).filter(Boolean);
  if (cleanNames.length) {
    const placeholders = cleanNames.map(() => '?').join(',');
    const rows = await all(
      `SELECT id, name, email FROM users WHERE LOWER(TRIM(name)) IN (${placeholders})`,
      cleanNames.map((n) => n.toLowerCase())
    );
    rows.forEach(add);
  }

  if (department) {
    const rows = await all(
      'SELECT id, name, email FROM users WHERE LOWER(TRIM(department)) = LOWER(TRIM(?))',
      [String(department).trim()]
    );
    rows.forEach(add);
  }

  const cleanRoles = roles.filter(Boolean);
  if (cleanRoles.length) {
    const placeholders = cleanRoles.map(() => '?').join(',');
    const rows = await all(
      `SELECT id, name, email FROM users WHERE role IN (${placeholders})`,
      cleanRoles
    );
    rows.forEach(add);
  }

  if (includeManagers) {
    const rows = await all(
      "SELECT id, name, email FROM users WHERE role IN ('admin', 'super_admin')"
    );
    rows.forEach(add);
  }

  extraEmails.forEach((email) => {
    const value = String(email || '').trim();
    if (value) add({ email: value, name: '' });
  });

  return [...recipients.values()];
}

async function logEmail({ recipients, subject, status, providerId = null, error = null }) {
  try {
    await run(
      `INSERT INTO email_logs (recipients, subject, status, provider_id, error, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        recipients.map((r) => r.email).join(', '),
        subject,
        status,
        providerId,
        error,
        new Date().toISOString(),
      ]
    );
  } catch (err) {
    console.warn('[mail] Günlük kaydı yazılamadı:', err.message);
  }
}

/**
 * Bildirimi ilgili kişilere e-posta olarak gönderir.
 * @returns {Promise<{sent:number, failed:number, skipped:boolean, recipients:string[]}>}
 */
async function notify({
  title,
  message,
  link = '',
  type = 'info',
  sender = 'PARSAN Portal',
  subjectPrefix = '[PARSAN]',
  ...recipientOptions
}) {
  const recipients = await resolveRecipients(recipientOptions);

  if (!recipients.length) {
    return { sent: 0, failed: 0, skipped: true, recipients: [] };
  }

  const subject = `${subjectPrefix} ${title}`.replace(/\s+/g, ' ').trim();
  const { html, text } = renderNotificationEmail({ title, message, link, type, sender });

  let sent = 0;
  let failed = 0;

  // Kişiye özel gönderim: alıcılar birbirinin e-posta adresini görmez.
  for (const recipient of recipients) {
    const result = await sendEmail({ to: recipient.email, subject, html, text });
    if (result.ok) {
      sent += 1;
      await logEmail({ recipients: [recipient], subject, status: 'sent', providerId: result.id });
    } else {
      failed += 1;
      await logEmail({
        recipients: [recipient],
        subject,
        status: result.skipped ? 'skipped' : 'failed',
        error: result.error || null,
      });
    }
  }

  return { sent, failed, skipped: false, recipients: recipients.map((r) => r.email) };
}

/** Ateşle-unut sarmalayıcı: e-posta hatası isteği asla bozmaz. */
function notifyAsync(payload) {
  notify(payload).catch((err) => console.warn('[mail] Bildirim gönderilemedi:', err.message));
}

module.exports = {
  isEnabled,
  sendEmail,
  notify,
  notifyAsync,
  resolveRecipients,
  renderNotificationEmail,
};
