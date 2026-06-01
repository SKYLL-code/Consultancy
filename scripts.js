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
    window.location.href = `mailto:skylltechconsult@gmail.com?subject=${subject}&body=${body}`;
  });
}

// Premium GEE Panel Functionality
(function() {
  const premiumFab = document.getElementById('premiumFab');
  const premiumOverlay = document.getElementById('premiumOverlay');
  const closePremiumPanel = document.getElementById('closePremiumPanel');
  const tabButtons = Array.from(document.querySelectorAll('.tab-button'));
  const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));
  const copyButtons = Array.from(document.querySelectorAll('.copy-button'));
  const unlockButtons = Array.from(document.querySelectorAll('.unlock-button'));
  const geminiEditor = document.getElementById('geminiEditor');
  const geminiCode = document.getElementById('geminiCode');
  const geminiPrompt = document.getElementById('geminiPrompt');
  const geminiRun = document.getElementById('geminiRun');
  const geminiOutput = document.getElementById('geminiOutput');
  const presetButtons = Array.from(document.querySelectorAll('.prompt-button'));
  const unlockedScripts = JSON.parse(localStorage.getItem('premiumGEEUnlocked') || '[]');

  function openPremiumPanel() {
    premiumOverlay.classList.add('open');
    premiumOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('drawer-open');
  }

  function closePremium() {
    premiumOverlay.classList.remove('open');
    premiumOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('drawer-open');
  }

  function setActiveTab(targetId) {
    tabButtons.forEach(button => {
      const active = button.dataset.target === targetId;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === targetId);
    });
  }

  function unlockScript(scriptId) {
    if (!unlockedScripts.includes(scriptId)) {
      unlockedScripts.push(scriptId);
      localStorage.setItem('premiumGEEUnlocked', JSON.stringify(unlockedScripts));
    }
    const card = document.querySelector(`.code-card.premium[data-script-id="${scriptId}"]`);
    if (!card) return;
    const lock = card.querySelector('.premium-lock');
    const blur = card.querySelector('.code-blur');
    if (lock) lock.remove();
    if (blur) {
      blur.classList.add('unlocked');
      blur.style.background = 'transparent';
      blur.style.position = 'static';
      blur.style.backdropFilter = 'none';
      blur.style.overflow = 'visible';
      const overlay = blur.querySelector(':scope > div');
      if (overlay) overlay.style.visibility = 'visible';
    }
    card.classList.add('unlocked');
    if (!card.querySelector('.open-gemini-button')) {
      const opener = document.createElement('button');
      opener.className = 'copy-button open-gemini-button';
      opener.textContent = 'Open in Gemini Editor';
      opener.addEventListener('click', () => openGeminiEditor(scriptId));
      card.appendChild(opener);
    }
  }

  function unlockAllPremiumScripts() {
    document.querySelectorAll('.code-card.premium').forEach(card => {
      const scriptId = card.dataset.scriptId;
      if (scriptId) unlockScript(scriptId);
    });
  }

  function startPaychanguCheckout(scriptId) {
    const txRef = `skylltech_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const checkoutOptions = {
      public_key: 'YOUR_PAYCHANGU_PUBLIC_KEY_HERE', // REPLACE WITH YOUR PAYCHANGU PUBLIC KEY
      tx_ref: txRef,
      amount: 1,
      currency: 'MWK',
      country: 'MW',
      payment_options: 'mobilemoney,card',
      customer: {
        email: 'customer@example.com',
        phonenumber: '+265880000000',
        name: 'SKYLL TECH Customer'
      },
      customizations: {
        title: 'Unlock Premium GEE Code',
        description: 'Pay to unlock premium Earth Engine scripts',
        logo: 'https://skyll-code.github.io/Consultancy/assets/LOGO2.png'
      },
      callback: function(response) {
        if (response && response.status === 'success') {
          unlockScript(scriptId);
          alert('Payment verified! Premium code unlocked.');
        } else {
          alert('Payment not verified. Please try again.');
        }
      }
    };

    if (window.PaychanguCheckout) {
      window.PaychanguCheckout(checkoutOptions).open();
    } else {
      alert('Paychangu is unavailable. Please refresh the page.');
    }
  }

  function openGeminiEditor(scriptId) {
    const codeElement = document.getElementById(scriptId);
    if (!codeElement) return;
    geminiCode.value = codeElement.innerText.trim();
    geminiPrompt.value = '';
    geminiOutput.innerText = '// Modified code will appear here.';
    geminiEditor.classList.add('open');
    geminiEditor.scrollIntoView({ behavior: 'smooth' });
  }

  function simulateGeminiEdit(code, prompt) {
    const promptText = prompt ? `// Gemini edit applied: ${prompt}\n` : '// Gemini edit placeholder\n';
    return `${promptText}${code}`;
  }

  premiumFab?.addEventListener('click', openPremiumPanel);
  closePremiumPanel?.addEventListener('click', closePremium);
  premiumOverlay?.addEventListener('click', (event) => {
    if (event.target === premiumOverlay) closePremium();
  });

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const email = button.dataset.email;
      if (email) {
        window.location.href = `mailto:${email}?subject=GEE%20Code%20Request&body=Hello%20SKYLL%20TECH%2C%0A%0AI%20would%20like%20to%20request%20custom%20Google%20Earth%20Engine%20code%20for%20my%20project.%0A%0APlease%20describe%20your%20analysis%20or%20data%20requirements%20here.`;
        return;
      }
      setActiveTab(button.dataset.target);
    });
  });

  copyButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.copyTarget);
      if (!target) return;
      navigator.clipboard.writeText(target.innerText.trim()).then(() => {
        const original = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => button.textContent = original, 1200);
      });
    });
  });

  unlockButtons.forEach(button => {
    button.addEventListener('click', () => {
      const scriptId = button.dataset.scriptId;
      if (scriptId) startPaychanguCheckout(scriptId);
    });
  });

  geminiRun?.addEventListener('click', () => {
    const promptText = geminiPrompt?.value.trim() || '';
    geminiOutput.innerText = simulateGeminiEdit(geminiCode.value, promptText);
  });

  presetButtons.forEach(button => {
    button.addEventListener('click', () => {
      geminiPrompt.value = button.dataset.preset;
    });
  });

  unlockedScripts.forEach(scriptId => unlockScript(scriptId));
  // Demo unlock all premium snippets so the paid code is visible immediately.
  unlockAllPremiumScripts();
})();
