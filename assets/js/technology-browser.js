document.querySelectorAll("[data-technology-browser]").forEach((panel) => {
  const alphabet = panel.querySelector("[data-technology-alpha]");
  const popular = panel.querySelector("[data-technology-popular]");
  const popularLabel = panel.querySelector("[data-technology-popular-label]");
  const results = panel.querySelector("[data-technology-results]");
  const letters = Array.from(panel.querySelectorAll("[data-technology-letter]"));
  const technologies = Array.from(panel.querySelectorAll("[data-technology-item]"));

  if (!alphabet || !popular || !results || letters.length === 0 || technologies.length === 0) return;

  alphabet.hidden = false;

  letters.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedLetter = button.dataset.technologyLetter;

      popular.hidden = true;
      if (popularLabel) popularLabel.hidden = true;
      results.hidden = false;

      technologies.forEach((item) => {
        item.hidden = item.dataset.technologyInitial !== selectedLetter;
      });

      letters.forEach((letterButton) => {
        letterButton.setAttribute("aria-pressed", String(letterButton === button));
      });
    });
  });
});
