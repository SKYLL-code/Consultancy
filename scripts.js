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
    premiumFab.classList.add('hidden');
  }

  function closePremium() {
    premiumOverlay.classList.remove('open');
    premiumOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('drawer-open');
    premiumFab.classList.remove('hidden');
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

  const paychanguVerifyEndpoint = '/verify-paychangu';
  const paychanguStatusEndpoint = '/payment-status';

  async function verifyPaychanguTransaction(txRef, transaction) {
    try {
      const response = await fetch(paychanguVerifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx_ref: txRef, transaction })
      });
      return await response.json();
    } catch (error) {
      console.error('Paychangu verification request failed:', error);
      return { success: false, message: error.message };
    }
  }

  async function getPaychanguStatus(txRef) {
    if (!txRef) {
      return { success: false, message: 'tx_ref is required.' };
    }
    try {
      const response = await fetch(`${paychanguStatusEndpoint}?tx_ref=${encodeURIComponent(txRef)}`);
      return await response.json();
    } catch (error) {
      console.error('Payment status request failed:', error);
      return { success: false, message: error.message };
    }
  }

  async function pollPaychanguStatus(txRef, scriptId, attempts = 0) {
    const maxAttempts = 8;
    const delayMs = 3000;

    if (attempts >= maxAttempts) {
      alert('Payment verification is still pending. Please wait a few moments and refresh this page.');
      return;
    }

    const statusResult = await getPaychanguStatus(txRef);
    if (statusResult.success && statusResult.status === 'verified') {
      unlockScript(scriptId);
      clearPendingPaychanguTxRef();
      alert('Payment confirmed by webhook! Premium code unlocked.');
      return;
    }

    if (statusResult.status === 'failed') {
      clearPendingPaychanguTxRef();
      alert('Payment failed or was declined. Please try again.');
      return;
    }

    setTimeout(() => pollPaychanguStatus(txRef, scriptId, attempts + 1), delayMs);
  }

  function savePendingPaychanguTxRef(txRef, scriptId) {
    localStorage.setItem('pendingPaychanguTxRef', txRef);
    localStorage.setItem('pendingPaychanguScriptId', scriptId);
  }

  function clearPendingPaychanguTxRef() {
    localStorage.removeItem('pendingPaychanguTxRef');
    localStorage.removeItem('pendingPaychanguScriptId');
  }

  async function resumePendingPaychanguStatus() {
    const txRef = localStorage.getItem('pendingPaychanguTxRef');
    const scriptId = localStorage.getItem('pendingPaychanguScriptId');
    if (txRef && scriptId) {
      await pollPaychanguStatus(txRef, scriptId);
    }
  }

  function startPaychanguCheckout(scriptId) {
    const txRef = `skylltech_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    savePendingPaychanguTxRef(txRef, scriptId);
    const checkoutOptions = {
      public_key: 'pub-test-epj50KELdZlBOxRSOYJ0xi2qRSepDSzR',
      tx_ref: txRef,
      amount: 100,
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
      callback: async function(response) {
        if (response && response.status === 'success') {
          const verifyResult = await verifyPaychanguTransaction(txRef, response);
          if (verifyResult.success) {
            unlockScript(scriptId);
            clearPendingPaychanguTxRef();
            alert('Payment verified! Premium code unlocked.');
          } else {
            console.warn('Paychangu verification response:', verifyResult);
            alert('Payment received but verification is pending. Checking status via webhook...');
            pollPaychanguStatus(txRef, scriptId);
          }
        } else {
          clearPendingPaychanguTxRef();
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
})();
