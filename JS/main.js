(function () {
  var msg = [
    "مرحبًا فريق مصنع الثقة،",
    "وصلتكم عن طريق الموقع،",
    "أبغى عرض سعر لـ الستائر أو أبواب الأكورديون،",
    "وهل متوفر قياس ومعاينة داخل البحرين؟",
    "بانتظار ردكم، شكرًا لكم.",
  ].join("\n");
  var btn = document.getElementById("whatsapp-btn");
  if (btn) {
    btn.href = "https://wa.me/97336789207?text=" + encodeURIComponent(msg);
  }
})();

(function () {
  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightbox-img");
  const lbDownload = document.getElementById("lightbox-download");
  const lbClose = document.getElementById("lightbox-close");

  // Make every image in the page clickable (except logo & carousel nav)
  const images = document.querySelectorAll(
    "img:not(.navbar-brand img):not(.carousel-item img):not(.mega-menu img)"
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

  lbClose.addEventListener("click", closeLightbox);

  // Close when clicking outside the image
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeLightbox();
    }
  });
})();
