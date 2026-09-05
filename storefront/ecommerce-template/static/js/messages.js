document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.querySelectorAll('.django-message').forEach(el => {
      el.style.transition = 'opacity 0.5s ease';
      el.style.opacity = 0;
      setTimeout(() => el.remove(), 500);
    });
  }, 4000); // 4 seconds
});
