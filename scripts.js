// Basic JS: set year and handle contact form by launching mailto (simple fallback)
document.getElementById('year').textContent = new Date().getFullYear();


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
