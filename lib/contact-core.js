const nodemailer = require('nodemailer');

const ALLOWED_SERVICES = new Set([
  'Website Development',
  'Video Editing',
  'Graphics Designing',
]);

const ALLOWED_CONTACT_METHODS = new Set(['whatsapp', 'gmail']);

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function sanitizeSingleLine(value, maxLength = 120) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\u0000/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeMultiline(value, maxLength = 2000) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\u0000/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .slice(0, maxLength);
}

function normalizeContactMethod(value) {
  const method = sanitizeSingleLine(value, 30).toLowerCase();

  if (method === 'email') {
    return 'gmail';
  }

  return method;
}

function normalizeService(value) {
  const service = sanitizeSingleLine(value, 60);
  const match = [...ALLOWED_SERVICES].find(
    (candidate) => candidate.toLowerCase() === service.toLowerCase()
  );

  return match || '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function normalizeWhatsAppAddress(value) {
  const cleaned = sanitizeSingleLine(value, 40).replace(/\s+/g, '');

  if (!cleaned) {
    return '';
  }

  if (cleaned.startsWith('whatsapp:')) {
    return cleaned;
  }

  if (cleaned.startsWith('+')) {
    return `whatsapp:${cleaned}`;
  }

  return `whatsapp:+${cleaned}`;
}

function validateSubmission(payload) {
  const honeypot = sanitizeSingleLine(
    payload.company || payload.website || payload.companyName || '',
    120
  );

  if (honeypot) {
    throw createError(400, 'Submission rejected.');
  }

  const submittedAt = Number(payload.submittedAt);
  const now = Date.now();

  if (!Number.isFinite(submittedAt)) {
    throw createError(400, 'Submission expired. Please reload the page and try again.');
  }

  if (submittedAt > now + 60000) {
    throw createError(400, 'Submission expired. Please reload the page and try again.');
  }

  if (now - submittedAt < 3000) {
    throw createError(400, 'Please wait a few seconds before sending the form.');
  }

  if (now - submittedAt > 24 * 60 * 60 * 1000) {
    throw createError(400, 'Submission expired. Please reload the page and try again.');
  }

  const name = sanitizeSingleLine(payload.name, 80);
  const email = sanitizeSingleLine(payload.email, 120).toLowerCase();
  const phone = sanitizeSingleLine(payload.phone, 30);
  const projectTitle = sanitizeSingleLine(payload.projectTitle, 120);
  const description = sanitizeMultiline(payload.description, 2000);
  const reference = sanitizeSingleLine(payload.reference, 300);
  const service = normalizeService(payload.service);
  const contactMethod = normalizeContactMethod(payload.contactMethod);

  if (!name) {
    throw createError(400, 'Please enter your name.');
  }

  if (!email || !isValidEmail(email)) {
    throw createError(400, 'Please enter a valid email address.');
  }

  if (!phone || !isValidPhone(phone)) {
    throw createError(400, 'Please enter a valid phone number.');
  }

  if (!projectTitle) {
    throw createError(400, 'Please enter a project title.');
  }

  if (!description || description.length < 10) {
    throw createError(400, 'Please add a little more detail about the project.');
  }

  if (!service) {
    throw createError(400, 'Please select a service type.');
  }

  if (!ALLOWED_CONTACT_METHODS.has(contactMethod)) {
    throw createError(400, 'Please select WhatsApp or Gmail.');
  }

  if (reference) {
    try {
      new URL(reference);
    } catch {
      throw createError(400, 'Please provide a valid reference link.');
    }
  }

  return {
    name,
    email,
    phone,
    projectTitle,
    description,
    reference: reference || 'N/A',
    service,
    contactMethod,
  };
}

function buildInquiryMessage(data) {
  return [
    'New Project Inquiry from Portfolio Website',
    '',
    `Client Name: ${data.name}`,
    `Client Email: ${data.email}`,
    `Phone Number: ${data.phone}`,
    `Project Title: ${data.projectTitle}`,
    `Service Type: ${data.service}`,
    '',
    'Project Description:',
    data.description,
    '',
    'Reference:',
    data.reference,
    '',
    'Submitted From:',
    'Portfolio Website Contact Form',
  ].join('\n');
}

async function sendGmailMessage(message, replyTo) {
  const {
    SMTP_HOST = 'smtp.gmail.com',
    SMTP_PORT = '587',
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    MAIL_FROM,
    MAIL_TO = 'arvind90782@gmail.com',
  } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    throw createError(500, 'Email delivery is not configured.');
  }

  const port = Number.parseInt(SMTP_PORT, 10) || 587;
  const secure = parseBoolean(SMTP_SECURE, port === 465);

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: MAIL_FROM || `Portfolio Website <${SMTP_USER}>`,
    to: MAIL_TO,
    subject: 'New Client Project Request',
    text: message,
    replyTo: replyTo,
  });

  return {
    channel: 'gmail',
  };
}

async function sendWhatsAppMessage(message) {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM,
    WHATSAPP_TO = 'whatsapp:+919277072409',
  } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    throw createError(500, 'WhatsApp delivery is not configured.');
  }

  const from = normalizeWhatsAppAddress(TWILIO_WHATSAPP_FROM);
  const to = normalizeWhatsAppAddress(WHATSAPP_TO);

  if (!from || !to) {
    throw createError(500, 'WhatsApp delivery is not configured.');
  }

  const auth = Buffer.from(
    `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
  ).toString('base64');

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: message,
      }).toString(),
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createError(
      response.status,
      result.message || 'WhatsApp delivery failed.'
    );
  }

  return {
    channel: 'whatsapp',
  };
}

async function handleContactSubmission(payload) {
  const data = validateSubmission(payload);
  const message = buildInquiryMessage(data);

  if (data.contactMethod === 'gmail') {
    return sendGmailMessage(message, data.email);
  }

  if (data.contactMethod === 'whatsapp') {
    return sendWhatsAppMessage(message);
  }

  throw createError(400, 'Please select WhatsApp or Gmail.');
}

module.exports = {
  ALLOWED_SERVICES,
  buildInquiryMessage,
  createError,
  handleContactSubmission,
  normalizeContactMethod,
  normalizeService,
  sanitizeMultiline,
  sanitizeSingleLine,
  sendGmailMessage,
  sendWhatsAppMessage,
  validateSubmission,
};
