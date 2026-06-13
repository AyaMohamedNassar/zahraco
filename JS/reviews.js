(function () {
  "use strict";

  /* ── Config ─────────────────────────────── */
  const CARD_WIDTH = 400; // px — max-width of each card slot
  const CARD_GAP = 32; // px — gap between card centres
  const AUTOPLAY_MS = 5000; // ms between auto-advances
  const EASING = "cubic-bezier(0.34, 1.12, 0.64, 1)";

  /* ── DOM ─────────────────────────────────── */
  const track = document.getElementById("cr-track");
  const dotsWrap = document.getElementById("cr-dots");
  const btnPrev = document.getElementById("cr-prev");
  const btnNext = document.getElementById("cr-next");
  const activeName = document.getElementById("cr-active-name");

  if (!track) return; // guard — section not on page

  const slots = Array.from(track.querySelectorAll(".cr-slot"));
  const cards = Array.from(track.querySelectorAll(".cr-card"));
  const total = slots.length;
  let current = 0;
  let autoTimer = null;
  let isPaused = false;

  /* ── Build dots ─────────────────────────── */
  dotsWrap.innerHTML = "";
  slots.forEach((_, i) => {
    const d = document.createElement("button");
    d.className = "cr-dot" + (i === 0 ? " active" : "");
    d.setAttribute("aria-label", "انتقل للتقييم " + (i + 1));
    d.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(d);
  });

  const dots = Array.from(dotsWrap.querySelectorAll(".cr-dot"));

  /* ── Layout calc ─────────────────────────── */
  function getOffset(slotIndex, activeIndex) {
    // distance in card-widths from active
    const diff = slotIndex - activeIndex;
    return diff * (CARD_WIDTH + CARD_GAP);
  }

  function applyLayout(idx, animate) {
    slots.forEach((slot, i) => {
      const card = slot.querySelector(".cr-card");
      const diff = i - idx;
      const absDiff = Math.abs(diff);

      // position
      const offset = diff * (CARD_WIDTH + CARD_GAP);
      slot.style.setProperty("--offset", offset + "px");
      if (animate) {
        slot.style.transition = `left 0.7s ${EASING}`;
      } else {
        slot.style.transition = "none";
      }

      // active / inactive state
      const isActive = i === idx;
      card.classList.toggle("cr-is-active", isActive);

      // scale + opacity + blur via CSS vars — driven by JS
      let scale = isActive ? 1 : absDiff === 1 ? 0.85 : 0.72;
      let opacity = isActive ? 1 : absDiff === 1 ? 0.5 : 0.3;
      let blur = isActive ? 0 : absDiff === 1 ? 2 : 4;
      let zIndex = isActive ? 10 : absDiff === 1 ? 5 : 1;

      card.style.transform = `scale(${scale})`;
      card.style.opacity = opacity;
      card.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
      card.style.zIndex = zIndex;
      if (animate) {
        card.style.transition = `transform 0.7s ${EASING}, opacity 0.5s ease, filter 0.5s ease`;
      } else {
        card.style.transition = "none";
      }
    });

    // update dots
    dots.forEach((d, i) => d.classList.toggle("active", i === idx));

    // update name label
    const activeCard = cards[idx];
    const name = activeCard
      ? activeCard.querySelector(".cr-name")?.textContent || ""
      : "";
    if (activeName) activeName.textContent = name;

    // update nav buttons
    btnPrev.disabled = false;
    btnNext.disabled = false;
  }

  /* ── Navigation ─────────────────────────── */
  function goTo(idx) {
    current = (idx + total) % total;
    applyLayout(current, true);
    resetAutoplay();
  }

  function prev() {
    goTo(current - 1);
  }
  function next() {
    goTo(current + 1);
  }

  btnPrev.addEventListener("click", prev);
  btnNext.addEventListener("click", next);

  /* ── Autoplay ────────────────────────────── */
  function startAutoplay() {
    stopAutoplay();
    autoTimer = setInterval(() => {
      if (!isPaused) next();
    }, AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function resetAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  // pause on hover
  const stageWrap = document.querySelector(".cr-stage-wrap");
  if (stageWrap) {
    stageWrap.addEventListener("mouseenter", () => {
      isPaused = true;
    });
    stageWrap.addEventListener("mouseleave", () => {
      isPaused = false;
    });
    stageWrap.addEventListener("focusin", () => {
      isPaused = true;
    });
    stageWrap.addEventListener("focusout", () => {
      isPaused = false;
    });
  }

  /* ── Keyboard ────────────────────────────── */
  document.addEventListener("keydown", (e) => {
    // only act when reviews section is in viewport
    const section = document.getElementById("reviews");
    if (!section) return;
    const rect = section.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;

    if (e.key === "ArrowRight") prev();
    if (e.key === "ArrowLeft") next();
  });

  /* ── Touch / swipe ───────────────────────── */
  let touchStartX = null;
  track.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
    },
    { passive: true },
  );
  track.addEventListener(
    "touchend",
    (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) {
        dx > 0 ? prev() : next();
      }
      touchStartX = null;
    },
    { passive: true },
  );

  /* ── Click inactive card to activate ─────── */
  slots.forEach((slot, i) => {
    slot.addEventListener("click", () => {
      if (i !== current) goTo(i);
    });
  });

  /* ── Init ────────────────────────────────── */
  // Run layout without animation first
  applyLayout(current, false);
  // Then start
  startAutoplay();

  // Re-layout on resize (card offsets may need recalc)
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => applyLayout(current, false), 150);
  });
})();
