(function () {
  "use strict";

  const MAIL_ENDPOINT = "../Trustco/send-mail.php";

  const RATE_WINDOW_MS = 5 * 60 * 1000;
  const RATE_MAX = 3;
  const RL_KEY = "trustco_rl";

  const form = document.getElementById("contact-form");
  const btnSend = document.getElementById("btn-send");
  const alertBox = document.getElementById("form-alert");
  const fieldName = document.getElementById("sender-name");
  const fieldEmail = document.getElementById("sender-email");
  const fieldMsg = document.getElementById("sender-message");
  const honeypot = document.getElementById("website-url");

  const errorName = document.getElementById("error-name");
  const errorEmail = document.getElementById("error-email");
  const errorMsg = document.getElementById("error-message");

  function sanitize(str) {
    return str.replace(/[<>"'&]/g, function (ch) {
      return {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "&": "&amp;",
      }[ch];
    });
  }

  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = "form-alert form-alert--" + type;
    alertBox.style.display = "block";
    alertBox.setAttribute("role", "alert");
    alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (type === "success") {
      setTimeout(function () {
        alertBox.style.display = "none";
      }, 7000);
    }
  }

  function setFieldError(input, errorSpan, message) {
    if (message) {
      input.classList.add("is-invalid");
      input.setAttribute("aria-invalid", "true");
      errorSpan.textContent = message;
    } else {
      input.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
      errorSpan.textContent = "";
    }
  }

  function clearFieldErrors() {
    setFieldError(fieldName, errorName, "");
    setFieldError(fieldEmail, errorEmail, "");
    setFieldError(fieldMsg, errorMsg, "");
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const NAME_RE = /^[\u0600-\u06FFa-zA-Z\s.'\-]+$/;

  function validateName() {
    var name = fieldName.value.trim();
    if (!name) {
      setFieldError(fieldName, errorName, "يرجى إدخال اسمك الكامل.");
      return false;
    }
    if (name.length < 2) {
      setFieldError(fieldName, errorName, "الاسم يجب أن يكون حرفين على الأقل.");
      return false;
    }
    if (name.length > 100) {
      setFieldError(fieldName, errorName, "الاسم لا يتجاوز 100 حرف.");
      return false;
    }
    if (!NAME_RE.test(name)) {
      setFieldError(
        fieldName,
        errorName,
        "الاسم يجب أن يحتوي على أحرف فقط (عربية أو إنجليزية).",
      );
      return false;
    }
    setFieldError(fieldName, errorName, "");
    return true;
  }

  function validateEmail() {
    var email = fieldEmail.value.trim();
    if (!email) {
      setFieldError(fieldEmail, errorEmail, "يرجى إدخال بريدك الإلكتروني.");
      return false;
    }
    if (email.length > 254) {
      setFieldError(fieldEmail, errorEmail, "البريد الإلكتروني طويل جدًا.");
      return false;
    }
    if (!EMAIL_RE.test(email)) {
      setFieldError(fieldEmail, errorEmail, "يرجى إدخال بريد إلكتروني صحيح.");
      return false;
    }
    setFieldError(fieldEmail, errorEmail, "");
    return true;
  }

  function validateMessage() {
    var msg = fieldMsg.value.trim();
    if (!msg) {
      setFieldError(fieldMsg, errorMsg, "يرجى كتابة رسالتك.");
      return false;
    }
    if (msg.length < 10) {
      setFieldError(
        fieldMsg,
        errorMsg,
        "الرسالة يجب أن تكون 10 أحرف على الأقل.",
      );
      return false;
    }
    if (msg.length > 2000) {
      setFieldError(fieldMsg, errorMsg, "الرسالة لا تتجاوز 2000 حرف.");
      return false;
    }
    setFieldError(fieldMsg, errorMsg, "");
    return true;
  }

  function validateAll() {
    var a = validateName();
    var b = validateEmail();
    var c = validateMessage();
    return a && b && c;
  }

  fieldName.addEventListener("blur", validateName);
  fieldEmail.addEventListener("blur", validateEmail);
  fieldMsg.addEventListener("blur", validateMessage);

  fieldName.addEventListener("input", function () {
    if (fieldName.classList.contains("is-invalid")) validateName();
  });
  fieldEmail.addEventListener("input", function () {
    if (fieldEmail.classList.contains("is-invalid")) validateEmail();
  });
  fieldMsg.addEventListener("input", function () {
    if (fieldMsg.classList.contains("is-invalid")) validateMessage();
  });

  function isRateLimited() {
    try {
      var raw = localStorage.getItem(RL_KEY);
      var timestamps = raw ? JSON.parse(raw) : [];
      var now = Date.now();

      timestamps = timestamps.filter(function (t) {
        return now - t < RATE_WINDOW_MS;
      });
      if (timestamps.length >= RATE_MAX) return true;
      timestamps.push(now);
      localStorage.setItem(RL_KEY, JSON.stringify(timestamps));
      return false;
    } catch (e) {
      return false;
    }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    alertBox.style.display = "none";

    if (honeypot && honeypot.value) {
      showAlert("تم إرسال رسالتك بنجاح! ✓", "success");
      form.reset();
      return;
    }

    if (!validateAll()) {
      var firstInvalid = form.querySelector(".is-invalid");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    if (isRateLimited()) {
      showAlert(
        "يرجى الانتظار قبل إرسال رسالة أخرى. حاول مرة أخرى خلال 5 دقائق.",
        "error",
      );
      return;
    }

    btnSend.disabled = true;
    btnSend.classList.add("is-loading");

    try {
      var response = await fetch(MAIL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_name: sanitize(fieldName.value.trim()),
          from_email: sanitize(fieldEmail.value.trim()),
          from_phone: sanitize(
            document.getElementById("sender-phone").value.trim(),
          ),
          service: sanitize(document.getElementById("sender-service").value),
          message: sanitize(fieldMsg.value.trim()),
        }),
      });

      var data = await response.json();

      if (response.ok && data.success) {
        showAlert(
          "تم إرسال رسالتك بنجاح! سنتواصل معك خلال 24 ساعة. ✓",
          "success",
        );
        form.reset();
        clearFieldErrors();
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
})();
