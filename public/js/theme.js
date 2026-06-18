// Theme management: Light / Dark Mode
document.addEventListener('DOMContentLoaded', () => {
  const currentTheme = localStorage.getItem('theme') || 'light';
  applyTheme(currentTheme);

  // Auto-bind theme toggle buttons if they exist
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const activeTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
    });
  }
});

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  // Update toggle button icon/visuals if present
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) {
    if (theme === 'dark') {
      themeIcon.className = 'fi fi-rr-sun'; // Sun icon for switching back to light mode
    } else {
      themeIcon.className = 'fi fi-rr-moon'; // Moon icon for switching to dark mode
    }
  }
}
