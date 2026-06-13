// ─── Configuration ────────────────────────────────────────────────────────
// Point this to where you place send-mail.php on your IIS server
const MAIL_ENDPOINT = "../send-mail.php";
// ──────────────────────────────────────────────────────────────────────────

const btnSend = document.getElementById("btn-send");
const alertBox = document.getElementById("form-alert");
const fieldName = document.getElementById("sender-name");
const fieldEmail = document.getElementById("sender-email");
const fieldMsg = document.getElementById("sender-message");

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

function validate() {
  const name = fieldName.value.trim();
  const email = fieldEmail.value.trim();
  const msg = fieldMsg.value.trim();

  if (!name) {
    showAlert("يرجى إدخال اسمك الكامل.", "error");
    fieldName.focus();
    return false;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAlert("يرجى إدخال بريد إلكتروني صحيح.", "error");
    fieldEmail.focus();
    return false;
  }
  if (!msg || msg.length < 10) {
    showAlert("يرجى كتابة رسالتك (10 أحرف على الأقل).", "error");
    fieldMsg.focus();
    return false;
  }
  return true;
}

btnSend.addEventListener("click", async function () {
  if (!validate()) return;

  btnSend.disabled = true;

  btnSend.classList.add("is-loading");

  try {
    const response = await fetch(MAIL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_name: fieldName.value.trim(),
        from_email: fieldEmail.value.trim(),
        message: fieldMsg.value.trim(),
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showAlert(
        "تم إرسال رسالتك بنجاح! سنتواصل معك خلال 24 ساعة. ✓",
        "success",
      );
      fieldName.value = "";
      fieldEmail.value = "";
      fieldMsg.value = "";
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
