// ─── Configuration ────────────────────────────────────────────────────────
// Point this to where you place send-mail.php on your IIS server
const MAIL_ENDPOINT = "../send-mail.php";
// ──────────────────────────────────────────────────────────────────────────

// ─── CSRF Token ──────────────────────────────────────────────────────────
// Generate a per-session token to protect against cross-site request forgery
function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
const csrfToken = generateCSRFToken();
const csrfMeta = document.getElementById("csrf-meta");
if (csrfMeta) csrfMeta.setAttribute("content", csrfToken);

// ─── DOM References ──────────────────────────────────────────────────────
const contactForm = document.getElementById("contact-form");
const btnSend = document.getElementById("btn-send");
const alertBox = document.getElementById("form-alert");
const fieldName = document.getElementById("sender-name");
const fieldEmail = document.getElementById("sender-email");
const fieldMsg = document.getElementById("sender-message");
const honeypot = document.getElementById("website-url");
const charCounter = document.getElementById("char-counter");

// Per-field error containers
const nameError = document.getElementById("name-error");
const emailError = document.getElementById("email-error");
const messageError = document.getElementById("message-error");

// ─── Constants ───────────────────────────────────────────────────────────
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 2000;
const MIN_MESSAGE_LENGTH = 10;
const MIN_NAME_LENGTH = 2;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 3;
const MIN_SUBMIT_TIME_MS = 2000; // Bot detection: form filled in < 2 seconds is suspicious

// ─── Rate Limiting (client-side) ─────────────────────────────────────────
const RATE_LIMIT_KEY = "zahraco_contact_timestamps";
const pageLoadTime = Date.now();

function getSubmitTimestamps() {
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return [];
    const timestamps = JSON.parse(raw);
    const now = Date.now();
    // Keep only timestamps within the window
    return timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  } catch {
    return [];
  }
}

function recordSubmitTimestamp() {
  const timestamps = getSubmitTimestamps();
  timestamps.push(Date.now());
  try {
    sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(timestamps));
  } catch {
    // sessionStorage unavailable — fail open
  }
}

function isRateLimited() {
  return getSubmitTimestamps().length >= RATE_LIMIT_MAX;
}

// ─── Sanitization ────────────────────────────────────────────────────────
function sanitizeInput(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function stripControlChars(str) {
  // Remove all control characters except newline (\n) and carriage return (\r)
  return str.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

// ─── Alert Display ───────────────────────────────────────────────────────
function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = "form-alert form-alert--" + type;
  alertBox.style.display = "block";
  alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  if (type === "success") {
    setTimeout(() => {
      alertBox.style.display = "none";
    }, 7000);
  }
}

function hideAlert() {
  alertBox.style.display = "none";
  alertBox.textContent = "";
}

// ─── Per-field Error Helpers ─────────────────────────────────────────────
function setFieldError(inputEl, errorEl, message) {
  errorEl.textContent = message;
  inputEl.classList.add("field--invalid");
  inputEl.classList.remove("field--valid");
  inputEl.setAttribute("aria-invalid", "true");
}

function clearFieldError(inputEl, errorEl) {
  errorEl.textContent = "";
  inputEl.classList.remove("field--invalid");
  inputEl.removeAttribute("aria-invalid");
}

function setFieldValid(inputEl, errorEl) {
  clearFieldError(inputEl, errorEl);
  inputEl.classList.add("field--valid");
}

// ─── Validation Rules ────────────────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
// Allow Arabic, Latin, spaces, dots, hyphens, and apostrophes
const NAME_REGEX = /^[\u0600-\u06FFa-zA-Z\s.'\-\u0750-\u077F\u08A0-\u08FF]+$/;

function validateName(showSuccess) {
  const value = fieldName.value.trim();
  if (!value) {
    setFieldError(fieldName, nameError, "يرجى إدخال اسمك الكامل.");
    return false;
  }
  if (value.length < MIN_NAME_LENGTH) {
    setFieldError(fieldName, nameError, `الاسم قصير جدًا (${MIN_NAME_LENGTH} أحرف على الأقل).`);
    return false;
  }
  if (value.length > MAX_NAME_LENGTH) {
    setFieldError(fieldName, nameError, `الاسم طويل جدًا (${MAX_NAME_LENGTH} حرف كحد أقصى).`);
    return false;
  }
  if (!NAME_REGEX.test(value)) {
    setFieldError(fieldName, nameError, "الاسم يحتوي على أحرف غير مسموحة.");
    return false;
  }
  if (showSuccess) setFieldValid(fieldName, nameError);
  else clearFieldError(fieldName, nameError);
  return true;
}

function validateEmail(showSuccess) {
  const value = fieldEmail.value.trim();
  if (!value) {
    setFieldError(fieldEmail, emailError, "يرجى إدخال بريدك الإلكتروني.");
    return false;
  }
  if (value.length > MAX_EMAIL_LENGTH) {
    setFieldError(fieldEmail, emailError, `البريد الإلكتروني طويل جدًا (${MAX_EMAIL_LENGTH} حرف كحد أقصى).`);
    return false;
  }
  if (!EMAIL_REGEX.test(value)) {
    setFieldError(fieldEmail, emailError, "يرجى إدخال بريد إلكتروني صحيح.");
    return false;
  }
  if (showSuccess) setFieldValid(fieldEmail, emailError);
  else clearFieldError(fieldEmail, emailError);
  return true;
}

function validateMessage(showSuccess) {
  const value = fieldMsg.value.trim();
  if (!value) {
    setFieldError(fieldMsg, messageError, "يرجى كتابة رسالتك.");
    return false;
  }
  if (value.length < MIN_MESSAGE_LENGTH) {
    setFieldError(fieldMsg, messageError, `الرسالة قصيرة جدًا (${MIN_MESSAGE_LENGTH} أحرف على الأقل).`);
    return false;
  }
  if (value.length > MAX_MESSAGE_LENGTH) {
    setFieldError(fieldMsg, messageError, `الرسالة طويلة جدًا (${MAX_MESSAGE_LENGTH} حرف كحد أقصى).`);
    return false;
  }
  if (showSuccess) setFieldValid(fieldMsg, messageError);
  else clearFieldError(fieldMsg, messageError);
  return true;
}

function validateAll() {
  // Run all validations — do NOT short-circuit, so user sees all errors at once
  const nameOk = validateName(true);
  const emailOk = validateEmail(true);
  const msgOk = validateMessage(true);
  return nameOk && emailOk && msgOk;
}

// ─── Real-time Validation (on blur) ─────────────────────────────────────
fieldName.addEventListener("blur", () => {
  if (fieldName.value.trim()) validateName(true);
});

fieldEmail.addEventListener("blur", () => {
  if (fieldEmail.value.trim()) validateEmail(true);
});

fieldMsg.addEventListener("blur", () => {
  if (fieldMsg.value.trim()) validateMessage(true);
});

// Clear errors as user types (immediate feedback)
fieldName.addEventListener("input", () => {
  if (fieldName.classList.contains("field--invalid")) validateName(false);
});

fieldEmail.addEventListener("input", () => {
  if (fieldEmail.classList.contains("field--invalid")) validateEmail(false);
});

fieldMsg.addEventListener("input", () => {
  // Update character counter
  const len = fieldMsg.value.length;
  if (charCounter) {
    charCounter.textContent = `${len} / ${MAX_MESSAGE_LENGTH}`;
    charCounter.classList.toggle("char-counter--warn", len > MAX_MESSAGE_LENGTH * 0.9);
    charCounter.classList.toggle("char-counter--over", len > MAX_MESSAGE_LENGTH);
  }
  if (fieldMsg.classList.contains("field--invalid")) validateMessage(false);
});

// ─── Form Submit Handler ─────────────────────────────────────────────────
contactForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  hideAlert();

  // ── Honeypot check ──
  if (honeypot && honeypot.value) {
    // Silently pretend success to not tip off the bot
    showAlert("تم إرسال رسالتك بنجاح! سنتواصل معك خلال 24 ساعة. ✓", "success");
    contactForm.reset();
    return;
  }

  // ── Timing-based bot detection ──
  if (Date.now() - pageLoadTime < MIN_SUBMIT_TIME_MS) {
    showAlert("يرجى الانتظار قليلاً قبل الإرسال.", "error");
    return;
  }

  // ── Client-side rate limiting ──
  if (isRateLimited()) {
    showAlert("لقد أرسلت عدة رسائل بالفعل. يرجى الانتظار قبل المحاولة مرة أخرى.", "error");
    return;
  }

  // ── Validate all fields ──
  if (!validateAll()) {
    showAlert("يرجى تصحيح الأخطاء أدناه.", "error");
    // Focus the first invalid field
    const firstInvalid = contactForm.querySelector(".field--invalid");
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  // ── Sanitize values ──
  const safeName = sanitizeInput(stripControlChars(fieldName.value.trim()));
  const safeEmail = sanitizeInput(stripControlChars(fieldEmail.value.trim()));
  const safeMessage = sanitizeInput(stripControlChars(fieldMsg.value.trim()));

  btnSend.disabled = true;
  btnSend.classList.add("is-loading");

  try {
    const response = await fetch(MAIL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        from_name: safeName,
        from_email: safeEmail,
        message: safeMessage,
        _token: csrfToken,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showAlert(
        "تم إرسال رسالتك بنجاح! سنتواصل معك خلال 24 ساعة. ✓",
        "success",
      );
      contactForm.reset();
      // Reset field states
      [fieldName, fieldEmail, fieldMsg].forEach((f) => {
        f.classList.remove("field--valid", "field--invalid");
        f.removeAttribute("aria-invalid");
      });
      if (charCounter) charCounter.textContent = `0 / ${MAX_MESSAGE_LENGTH}`;
      recordSubmitTimestamp();
    } else if (response.status === 429) {
      showAlert(
        data.message || "لقد أرسلت عدة رسائل بالفعل. يرجى الانتظار قبل المحاولة مرة أخرى.",
        "error",
      );
    } else {
      showAlert(
        data.message || "حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.",
        "error",
      );
    }
  } catch (err) {
    console.error("Send error:", err);
    showAlert(
      "تعذّر الاتصال بالخادم. يرجى التحقق من اتصالك والمحاولة مرة أخرى.",
      "error",
    );
  } finally {
    btnSend.disabled = false;
    btnSend.classList.remove("is-loading");
  }
});
