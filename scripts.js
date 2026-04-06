// Basic JS: set year and handle contact form by launching mailto (simple fallback)
document.getElementById('year').textContent = new Date().getFullYear();

// Save scroll position before navigating to a service page
document.querySelectorAll('a.service-link').forEach(link => {
  link.addEventListener('click', () => {
    sessionStorage.setItem('scrollPosition', window.scrollY);
  });
});

// Handle back arrow - save scroll position and return to home
document.querySelectorAll('a.back-arrow').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.setItem('scrollPosition', '0');
    window.location.href = '../index.html';
  });
});

// Restore scroll position when returning to the home page
window.addEventListener('load', () => {
  const scrollPosition = sessionStorage.getItem('scrollPosition');
  if (scrollPosition !== null) {
    setTimeout(() => {
      window.scrollTo(0, parseInt(scrollPosition));
      sessionStorage.removeItem('scrollPosition');
    }, 100);
  }
});

const form = document.getElementById('contactForm');
if(form){
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    const subject = encodeURIComponent('Website contact from ' + name);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    // opens user's mail client; keep WhatsApp/Facebook links for direct contact
    window.location.href = `mailto:deedoc90@gmail.com?subject=${subject}&body=${body}`;
  });
}
