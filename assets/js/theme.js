const themeStorageKey = "field-notes-theme";
const savedTheme = localStorage.getItem(themeStorageKey);

if (savedTheme === "dark" || savedTheme === "light") {
  document.documentElement.dataset.theme = savedTheme;
}

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".theme-toggle-input");
  if (!toggle) {
    return;
  }

  toggle.checked = document.documentElement.dataset.theme === "dark";
  toggle.addEventListener("change", () => {
    const theme = toggle.checked ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(themeStorageKey, theme);
  });
});
