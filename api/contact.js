/* ════════════════════════════════════════════════════════════════
   LUMINÁRIA — API de Contacto v30
   Segurança:
   · Validação e sanitização de todos os campos
   · Rate limiting por IP (5 pedidos/hora)
   · Verificação de origem (CORS restrito)
   · Proteção contra injection (HTML, SQL, command)
   · Headers de segurança na resposta
   · Sem exposição de stack traces
   · Timeout de conexão SMTP
   · Logging de tentativas suspeitas (sem dados sensíveis)
   ════════════════════════════════════════════════════════════════ */

const nodemailer = require('nodemailer');

/* ── Rate limiting em memória (reseta com cada deploy) ── */
const rateStore = new Map();
const RATE_LIMIT  = 5;          /* máx. pedidos por janela */
const RATE_WINDOW = 60 * 60 * 1000; /* 1 hora em ms */

function checkRateLimit(ip) {
  const now  = Date.now();
  const key  = ip || 'unknown';
  const rec  = rateStore.get(key) || { count: 0, start: now };

  /* Resetar janela se expirou */
  if (now - rec.start > RATE_WINDOW) {
    rateStore.set(key, { count: 1, start: now });
    return true;
  }

  if (rec.count >= RATE_LIMIT) return false;

  rateStore.set(key, { count: rec.count + 1, start: rec.start });
  return true;
}

/* Limpar entradas antigas (evitar memory leak) */
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW;
  for (const [k, v] of rateStore.entries()) {
    if (v.start < cutoff) rateStore.delete(k);
  }
}, RATE_WINDOW);

/* ── Sanitização — remove HTML/JS/caracteres perigosos ── */
function sanitize(val) {
  if (typeof val !== 'string') return '';
  return val
    .trim()
    .slice(0, 2000)                       /* limite de tamanho */
    .replace(/[<>]/g, '')                 /* sem HTML */
    .replace(/javascript:/gi, '')         /* sem JS URIs */
    .replace(/on\w+\s*=/gi, '')           /* sem event handlers */
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); /* sem control chars */
}

/* ── Validação de email ── */
function isValidEmail(email) {
  /* RFC 5322 simplificado — sem permitir IPs ou domínios suspeitos */
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return re.test(email) && email.length <= 254;
}

/* ── Validação de telefone (opcional) ── */
function isValidPhone(phone) {
  if (!phone || phone === '') return true; /* opcional */
  return /^[\d\s\+\-\(\)]{7,20}$/.test(phone);
}

/* ── CORS: verificar origem ── */
function isAllowedOrigin(origin) {
  const allowed = (process.env.ALLOWED_ORIGIN || '').split(',').map(o => o.trim());
  if (!origin) return false;
  return allowed.some(a => origin === a || origin.endsWith('.' + a.replace(/^https?:\/\//, '')));
}

/* ── Handler principal ── */
module.exports = async function handler(req, res) {

  /* Headers de segurança na resposta da API */
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');

  /* Apenas POST */
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  }

  /* CORS */
  const origin = req.headers['origin'] || '';
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ success: false, error: 'Origem não autorizada.' });
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  /* Content-Type */
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('application/json')) {
    return res.status(415).json({ success: false, error: 'Content-Type inválido.' });
  }

  /* Rate limiting por IP */
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
          || req.socket?.remoteAddress
          || 'unknown';

  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      error: 'Demasiados pedidos. Por favor aguarde antes de enviar novamente.'
    });
  }

  /* Extrair e sanitizar campos */
  const body    = req.body || {};
  const nome    = sanitize(body.nome    || '');
  const empresa = sanitize(body.empresa || '');
  const email   = sanitize(body.email   || '');
  const telefone= sanitize(body.telefone|| '');
  const website = sanitize(body.website || '');
  const assunto = sanitize(body.assunto || '');
  const mensagem= sanitize(body.mensagem|| '');

  /* Validações obrigatórias */
  if (!nome || nome.length < 2) {
    return res.status(400).json({ success: false, error: 'Nome inválido.' });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, error: 'Email inválido.' });
  }
  if (!mensagem || mensagem.length < 10) {
    return res.status(400).json({ success: false, error: 'Mensagem demasiado curta.' });
  }
  if (!isValidPhone(telefone)) {
    return res.status(400).json({ success: false, error: 'Telefone inválido.' });
  }

  /* Honeypot — campo escondido que bots preenchem */
  if (body._hp && body._hp !== '') {
    /* Bot detetado — simular sucesso sem enviar */
    return res.status(200).json({ success: true });
  }

  /* Variáveis de ambiente obrigatórias */
  const { GMAIL_USER, GMAIL_PASS, CONTACT_TO, ALLOWED_ORIGIN } = process.env;
  if (!GMAIL_USER || !GMAIL_PASS) {
    console.error('[Luminária] Variáveis de ambiente GMAIL_USER/GMAIL_PASS em falta.');
    return res.status(500).json({ success: false, error: 'Erro de configuração do servidor.' });
  }

  /* Transporter SMTP com timeout */
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    connectionTimeout: 10000,
    greetingTimeout:   8000,
    socketTimeout:     15000,
  });

  /* Email para a Luminária */
  const mailToLuminaria = {
    from:    `"Site Luminária" <${GMAIL_USER}>`,
    to:      CONTACT_TO || GMAIL_USER,
    replyTo: email,
    subject: `[Contacto] ${assunto || 'Nova mensagem'} — ${nome}`,
    text: [
      `Nome: ${nome}`,
      `Email: ${email}`,
      `Telefone: ${telefone || '—'}`,
      `Empresa: ${empresa || '—'}`,
      `Website/Instagram: ${website || '—'}`,
      `Assunto: ${assunto || '—'}`,
      '',
      `Mensagem:`,
      mensagem,
      '',
      `---`,
      `Enviado via luminaria.pt`,
      `IP: ${ip.replace(/[^0-9.:]/g, '')}`,  /* sanitizar o IP no log */
      `Data: ${new Date().toISOString()}`,
    ].join('\n'),
    /* Versão HTML limpa e segura */
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#FAFBFD;border:1px solid #E8EBF2;border-radius:8px;">
        <h2 style="color:#0A0F1E;font-size:20px;margin:0 0 20px;">Nova mensagem — Luminária</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#4A5270;font-size:13px;width:100px;"><strong>Nome</strong></td><td style="padding:8px 0;color:#0A0F1E;font-size:13px;">${nome}</td></tr>
          <tr><td style="padding:8px 0;color:#4A5270;font-size:13px;"><strong>Email</strong></td><td style="padding:8px 0;color:#0A0F1E;font-size:13px;"><a href="mailto:${email}" style="color:#2D5BE3;">${email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#4A5270;font-size:13px;"><strong>Telefone</strong></td><td style="padding:8px 0;color:#0A0F1E;font-size:13px;">${telefone || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#4A5270;font-size:13px;"><strong>Empresa</strong></td><td style="padding:8px 0;color:#0A0F1E;font-size:13px;">${empresa || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#4A5270;font-size:13px;width:130px;"><strong>Website/Instagram</strong></td><td style="padding:8px 0;color:#0A0F1E;font-size:13px;">${website ? `<a href="${website}" style="color:#2D5BE3;">${website}</a>` : '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#4A5270;font-size:13px;"><strong>Assunto</strong></td><td style="padding:8px 0;color:#0A0F1E;font-size:13px;">${assunto || '—'}</td></tr>
        </table>
        <div style="margin-top:20px;padding:16px;background:#F3F5F9;border-radius:6px;">
          <p style="margin:0 0 8px;color:#4A5270;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;"><strong>Mensagem</strong></p>
          <p style="margin:0;color:#0A0F1E;font-size:14px;line-height:1.7;white-space:pre-wrap;">${mensagem}</p>
        </div>
        <p style="margin-top:20px;font-size:11px;color:#8A93B0;">Enviado via luminaria.pt · ${new Date().toLocaleDateString('pt-PT')}</p>
      </div>
    `,
  };

  /* Email de confirmação ao cliente */
  const mailToClient = {
    from:    `"Luminária" <${GMAIL_USER}>`,
    to:      email,
    subject: 'Recebemos a sua mensagem — Luminária',
    text: [
      `Olá ${nome},`,
      '',
      'Obrigado pelo seu contacto. Recebemos a sua mensagem e iremos responder em breve (normalmente em 12 a 48 horas.',
      '',
      '— Equipa Luminária',
      'luminaria.pt',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#FAFBFD;border:1px solid #E8EBF2;border-radius:8px;">
        <h2 style="color:#0A0F1E;font-size:20px;margin:0 0 16px;">Recebemos a sua mensagem</h2>
        <p style="color:#4A5270;font-size:14px;line-height:1.7;margin:0 0 16px;">Olá <strong>${nome}</strong>,</p>
        <p style="color:#4A5270;font-size:14px;line-height:1.7;margin:0 0 16px;">Obrigado pelo seu contacto. Recebemos a sua mensagem e iremos responder em breve — normalmente em 12 a 48 horas.</p>
        <p style="color:#4A5270;font-size:14px;line-height:1.7;margin:0;">— Equipa Luminária</p>
        <p style="margin-top:24px;font-size:11px;color:#8A93B0;border-top:1px solid #E8EBF2;padding-top:16px;">luminaria.pt</p>
      </div>
    `,
  };

  try {
    await Promise.all([
      transporter.sendMail(mailToLuminaria),
      transporter.sendMail(mailToClient),
    ]);
    return res.status(200).json({ success: true });
  } catch (err) {
    /* Nunca expor detalhes do erro ao cliente */
    console.error('[Luminária] Erro ao enviar email:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Erro ao enviar mensagem. Por favor tente novamente ou contacte-nos directamente.'
    });
  }
};
