(function () {
  var msg = [
    "مرحبًا فريق مصنع الزهراء ",
    "وصلتكم عن طريق الموقع،",
    "أبغى عرض سعر لـ الستائر أو أبواب الأكورديون،",
    "وهل متوفر قياس ومعاينة داخل السعودية؟",
    "بانتظار ردكم، شكرًا لكم.",
  ].join("\n");
  var btn = document.getElementById("whatsapp-btn");
  if (btn) {
    btn.href = "https://wa.me/9660561637207?text=" + encodeURIComponent(msg);
  }
})();

(function () {
  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightbox-img");
  const lbDownload = document.getElementById("lightbox-download");
  const lbClose = document.getElementById("lightbox-close");

  const images = document.querySelectorAll(
    "img:not(.navbar-brand img):not(.footer-gallery img):not(.mega-menu img):not(.story-img)",
  );

  images.forEach((img) => {
    img.classList.add("lightbox-trigger");
    img.addEventListener("click", () => openLightbox(img.src, img.alt));
  });

  function openLightbox(src, alt) {
    lbImg.src = src;
    lbImg.alt = alt || "";
    lbDownload.href = src;
    // Extract filename from path for the download attribute
    const filename = src.split("/").pop() || "image";
    lbDownload.setAttribute("download", filename);
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
    lbImg.src = "";
  }

  if (lbClose) {
    lbClose.addEventListener("click", closeLightbox);
  }

  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeLightbox();
    }
  });
})();

(function () {
  const yearSpan = document.getElementById("current-year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
})();
