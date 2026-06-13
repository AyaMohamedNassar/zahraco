// ── Scroll reveal ──────────────────────────
(function () {
  const revealEls = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 },
  );
  revealEls.forEach((el) => observer.observe(el));
})();

// ── Category filter tabs ───────────────────
(function () {
  const tabs = document.querySelectorAll(".filter-tab");
  const categories = document.querySelectorAll(".service-category");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const filter = tab.dataset.filter;

      categories.forEach((cat) => {
        if (filter === "all" || cat.dataset.category === filter) {
          cat.style.display = "";
        } else {
          cat.style.display = "none";
        }
      });

      document
        .querySelector(".services-grid-section")
        .scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();

