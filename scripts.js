document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  document.querySelectorAll('a.service-link').forEach(link => {
    link.addEventListener('click', () => {
      sessionStorage.setItem('scrollPosition', window.scrollY);
    });
  });

  document.querySelectorAll('a.back-arrow').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.setItem('scrollPosition', '0');
      window.location.href = '../index.html';
    });
  });

  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const message = document.getElementById('message').value.trim();
      const subject = encodeURIComponent('Website contact from ' + name);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
      window.location.href = `mailto:deedoc90@gmail.com?subject=${subject}&body=${body}`;
    });
  }
});

window.addEventListener('load', () => {
  const scrollPosition = sessionStorage.getItem('scrollPosition');
  if (scrollPosition !== null) {
    setTimeout(() => {
      window.scrollTo(0, parseInt(scrollPosition, 10));
      sessionStorage.removeItem('scrollPosition');
    }, 100);
  }
});
