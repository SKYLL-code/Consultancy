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

  // Temporary developer helper: force-unlock all premium scripts.
  // Set `window.FORCE_UNLOCK_PREMIUM = false` to disable later and re-lock manually.
  if (window.FORCE_UNLOCK_PREMIUM === undefined) window.FORCE_UNLOCK_PREMIUM = true;
  if (window.FORCE_UNLOCK_PREMIUM) {
    document.querySelectorAll('.premium-actions').forEach(span => {
      const id = span.dataset.scriptId;
      if (!id) return;
      // reveal the actions UI
      span.hidden = false;
      // mark in localStorage list
      if (!unlockedScripts.includes(id)) unlockedScripts.push(id);
      // update corresponding feature unlock button badge if present
      const featureBtn = document.querySelector(`.unlock-btn[data-script-id="${id}"]`);
      if (featureBtn) {
        featureBtn.classList.add('unlocked');
        let badge = featureBtn.querySelector('.badge');
        if (badge) {
          badge.classList.remove('locked');
          badge.classList.add('unlocked');
          badge.textContent = 'Unlocked';
        } else {
          badge = document.createElement('span');
          badge.className = 'badge unlocked';
          badge.textContent = 'Unlocked';
          featureBtn.appendChild(badge);
        }
      }
    });
    localStorage.setItem('premiumGEEUnlocked', JSON.stringify(unlockedScripts));
  }

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
    // Support features page unlock buttons: change text to View
    const featureBtn = document.querySelector(`.unlock-btn[data-script-id="${scriptId}"]`);
    if (featureBtn) {
      featureBtn.classList.add('unlocked');
      // Update or add badge
      let badge = featureBtn.querySelector('.badge');
      if (badge) {
        badge.classList.remove('locked');
        badge.classList.add('unlocked');
        badge.textContent = 'Unlocked';
      } else {
        badge = document.createElement('span');
        badge.className = 'badge unlocked';
        badge.textContent = 'Unlocked';
        featureBtn.appendChild(badge);
      }
      const actions = document.querySelector(`.premium-actions[data-script-id="${scriptId}"]`);
      if (actions) {
        actions.hidden = false;
      }
      featureBtn.onclick = () => {
        const code = (typeof PREMIUM_SNIPPETS !== 'undefined' && PREMIUM_SNIPPETS[scriptId]) ? PREMIUM_SNIPPETS[scriptId] : '// Premium code unlocked.';
        const expanded = document.getElementById('expandedArea');
        const pre = document.getElementById('expandedCode');
        if (pre) pre.textContent = code;
        if (expanded) expanded.hidden = false;
      };
    }
  }

  const PAYCHANGU_BACKEND_BASE_URL = (window.location.protocol === 'http:' || window.location.protocol === 'https:')
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://your-paychangu-backend.example.com';
  const PAYCHANGU_PUBLIC_KEY = 'PUB-N7RITDglPYPRjEZDW3H3uwKtvQNqgsjR';
  const paychanguVerifyEndpoint = `${PAYCHANGU_BACKEND_BASE_URL}/verify-paychangu`;
  const paychanguStatusEndpoint = `${PAYCHANGU_BACKEND_BASE_URL}/payment-status`;

  function networkAvailable() {
    return window.location.protocol === 'http:' || window.location.protocol === 'https:';
  }

  async function verifyPaychanguTransaction(txRef, transaction) {
    if (!networkAvailable()) {
      console.warn('Network unavailable for Paychangu verification in file preview mode.');
      return { success: false, message: 'network unavailable' };
    }
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
    if (!networkAvailable()) {
      console.warn('Network unavailable for Paychangu status check in file preview mode.');
      return { success: false, message: 'network unavailable' };
    }
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
    const maxAttempts = 15;
    const delayMs = 2000;

    if (attempts >= maxAttempts) {
      const btn = document.querySelector(`.unlock-btn[data-script-id="${scriptId}"]`);
      if (btn) {
        let badge = btn.querySelector('.badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'badge pending';
          btn.appendChild(badge);
        }
        badge.classList.add('pending');
        badge.textContent = '⏳ Verifying...';
      }
      console.log('Payment verification still pending after maximum polling attempts. Waiting silently until verification completes.');
      return;
    }

    try {
      const statusResult = await getPaychanguStatus(txRef);
      console.log(`Poll attempt ${attempts + 1}/${maxAttempts}: Status =`, statusResult);

      if (statusResult.success && statusResult.status === 'verified') {
        unlockScript(scriptId);
        clearPendingPaychanguTxRef();
        const btn = document.querySelector(`.unlock-btn[data-script-id="${scriptId}"]`);
        if (btn) {
          let badge = btn.querySelector('.badge');
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'badge unlocked';
            btn.appendChild(badge);
          }
          badge.classList.remove('pending', 'locked');
          badge.classList.add('unlocked');
          badge.textContent = '✓ Unlocked';
          setTimeout(() => {
            badge.textContent = '🔓';
          }, 2000);
        }
        return;
      }

      if (statusResult.status === 'failed') {
        clearPendingPaychanguTxRef();
        const btn = document.querySelector(`.unlock-btn[data-script-id="${scriptId}"]`);
        if (btn) {
          let badge = btn.querySelector('.badge');
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'badge';
            btn.appendChild(badge);
          }
          badge.classList.remove('pending', 'unlocked');
          badge.classList.add('locked');
          badge.textContent = '❌ Failed';
          setTimeout(() => {
            badge.textContent = '🔒';
            badge.classList.add('locked');
          }, 2000);
        }
        return;
      }

      // Continue polling if status is pending or unknown
      setTimeout(() => pollPaychanguStatus(txRef, scriptId, attempts + 1), delayMs);
    } catch (error) {
      console.error('Error polling payment status:', error);
      setTimeout(() => pollPaychanguStatus(txRef, scriptId, attempts + 1), delayMs);
    }
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
    if (!networkAvailable()) {
      console.warn('Skipping Paychangu status resume in file preview mode.');
      return;
    }

    const txRef = localStorage.getItem('pendingPaychanguTxRef');
    const scriptId = localStorage.getItem('pendingPaychanguScriptId');
    if (txRef && scriptId) {
      await pollPaychanguStatus(txRef, scriptId);
    }
  }

  function startPaychanguCheckout(scriptId) {
    const txRef = `skylltech_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    savePendingPaychanguTxRef(txRef, scriptId);
    const accessPageUrl = `${window.location.origin}/features.html`;
    const checkoutOptions = {
      public_key: PAYCHANGU_PUBLIC_KEY,
      tx_ref: txRef,
      amount: 5000,
      currency: 'MWK',
      country: 'MW',
      payment_options: 'mobilemoney,card',
      customer: {
        email: 'customer@example.com',
        phonenumber: '+265880000000',
        name: 'SKYLL TECH Customer'
      },
      customization: {
        title: 'Unlock Premium GEE Code',
        description: 'Pay to unlock premium Earth Engine scripts',
        logo: 'https://skyll-code.github.io/Consultancy/assets/LOGO2.png'
      },
      callback_url: accessPageUrl,
      return_url: accessPageUrl,
      callback: async function(response) {
        console.log('Paychangu callback received:', response);
        if (response && response.status === 'success') {
          // Trust Paychangu's callback - if they say success, the payment was successful
          // Unlock immediately and verify via backend/webhook
          unlockScript(scriptId);
          clearPendingPaychanguTxRef();
          alert('Payment processed! Premium code unlocked.');
          
          // Also verify with backend to ensure record is saved
          try {
            await verifyPaychanguTransaction(txRef, response);
            console.log('Backend verification succeeded');
          } catch (error) {
            console.log('Backend verification initiated (async):', error.message);
          }
        } else if (response && response.status === 'pending') {
          // Payment is still being processed (e.g., for some mobile money methods)
          console.log('Payment is pending, polling for status...');
          alert('Payment is being processed. Please wait...');
          pollPaychanguStatus(txRef, scriptId);
        } else {
          clearPendingPaychanguTxRef();
          alert('Payment was not successful. Please try again.');
          console.error('Payment failed or cancelled:', response);
        }
      }
    };

    if (window.PaychanguCheckout) {
      window.PaychanguCheckout(checkoutOptions);
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

  // Mapping of premium script placeholders (editable)
  const PREMIUM_SNIPPETS = {
    lulc: `// LULC (Supervised Classification) - example placeholder\n// 1. Load image and training data\nvar img = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').filterDate('2024-01-01','2024-12-31').median();\nvar training = /* Your training FC of points with 'class' property */ null;\n// 2. Sample and train\n// var samples = img.sampleRegions({collection: training, properties:['class'], scale:30});\n// var classifier = ee.Classifier.smileRandomForest(100).train(samples, 'class');\n// var classified = img.classify(classifier);\n// Map.addLayer(classified, {min:0, max:3, palette:['blue','green','brown','red']}, 'LULC');`,

    hydro: `// Hydrological modelling (simplified)\nvar dem = ee.Image('USGS/SRTMGL1_003');\nvar filled = dem.focal_mean(3);\nvar slope = ee.Terrain.slope(filled);\n// Flow direction/accumulation requires more complex algorithms not shown here\nMap.addLayer(slope, {min:0, max:60}, 'Slope');`,

    drought: `// Drought mapping (NDVI anomaly example)\nvar s2 = ee.ImageCollection('COPERNICUS/S2_SR').filterDate('2024-01-01','2024-12-31').median();\nvar ndvi = s2.normalizedDifference(['B8','B4']).rename('NDVI');\nvar ndvi_mean = ndvi.reduceRegion({reducer: ee.Reducer.mean(), geometry: ndvi.geometry(), scale: 1000});\n// Compute anomaly and visualize (placeholder)\nMap.addLayer(ndvi, {min:-0.5, max:1}, 'NDVI');`,

    flood: `// Flood risk mapping (water detection example)\nvar s1 = ee.ImageCollection('COPERNICUS/S1_GRD').filterDate('2024-01-01','2024-12-31').median();\nvar vv = s1.select('VV');\nvar water = vv.lt(-15);\nMap.addLayer(water.updateMask(water), {palette:['0000FF']}, 'Suspected Water');`,

    landslide: `// Landslide susceptibility (slope + rainfall placeholder)\nvar dem = ee.Image('USGS/SRTMGL1_003');\nvar slope = ee.Terrain.slope(dem);\nvar susceptible = slope.gt(30);\nMap.addLayer(susceptible.updateMask(susceptible), {palette:['FF6600']}, 'Susceptible Areas');`,

    msi: `// Multi-spectral indices: NDVI, NDWI\nvar s2 = ee.ImageCollection('COPERNICUS/S2_SR').filterDate('2024-06-01','2024-08-31').median();\nvar ndvi = s2.normalizedDifference(['B8','B4']).rename('NDVI');\nvar ndwi = s2.normalizedDifference(['B3','B8']).rename('NDWI');\nMap.addLayer(ndvi, {min:-0.5, max:1}, 'NDVI');\nMap.addLayer(ndwi, {min:-1, max:1}, 'NDWI');`,

    rusle: `// RUSLE components (simplified placeholders)\n// R = rainfall erosivity (external dataset)\n// K = soil erodibility (soil dataset)\n// LS = slope-length factor computed from DEM\n// C = cover-management factor (landcover)\n// P = support practice factor\n// Erosion = R.multiply(K).multiply(LS).multiply(C).multiply(P);\n// Map.addLayer(Erosion, {min:0, max:100}, 'Estimated Soil Loss');`
  };

  // Overwrite `lulc` snippet with the exact LULC code provided by the user.
  // This preserves the earlier placeholder while ensuring the preview and copy use the exact text.
  PREMIUM_SNIPPETS.lulc = `Map.addLayer(LM1)
Map.centerObject(LM1,10);

var image = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")
            .filterBounds(LM1)
            .filterDate('2024-01-01','2024-12-31')
            .filterMetadata('CLOUD_COVER','less_than',18)
            .median()
            .multiply(2.75e-05)
            .add(-0.2)
            .clip(LM1)
            
Map.addLayer(image,imageVisParam, 'image')

var samples = water.merge(vegetation).merge(bareland).merge(builtup)

print(samples)

var bands = ['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7']

var input = image.select(bands)

var trainImage = input.sampleRegions({
  collection: samples,
  properties: ['class'],
  scale: 30})
  
print(trainImage)
  

var trainData = trainImage.randomColumn()

var trainSet = trainData.filter(ee.Filter.lessThan('random',0.8))
var testSet = trainData.filter(ee.Filter.greaterThanOrEquals('random',0.8))

var classifier = ee.Classifier.smileCart().train({
  features: trainSet,
  classProperty: 'class',
  inputProperties: bands
})

var classified = input.classify(classifier)

Map.addLayer(classified, {min: 0, max: 3, palette: ['blue', 'green', 'red', 'yellow']}, 'Classified Land Cover')

// --- EXPORT CLASSIFIED IMAGE TO GOOGLE DRIVE ---
Export.image.toDrive({
  image: classified,
  description: 'Classified_LULC_2025',
  folder: 'GEE_Classification', // The folder name that will be created in your Google Drive
  region: LM1,                 // Uses your LM1 geometry boundary
  scale: 30,                   // Landsat resolution is 30 meters
  maxPixels: 1e13              // Prevents the export from failing due to size limits
});`;

  // Expose checkout and helper globally for features page
  window.startPaychanguCheckout = startPaychanguCheckout;
  window.unlockScript = unlockScript;

  // Open preview modal for premium items
  function openPreviewModal({ scriptId, title, description }) {
    const modal = document.getElementById('previewModal');
    if (!modal) return;
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc = document.getElementById('modalDesc');
    const modalCode = document.getElementById('modalCode');
    const previewBtn = document.getElementById('modalPreviewBtn');
    const copyBtn = document.getElementById('modalCopyBtn');
    const unlockBtn = document.getElementById('modalUnlockBtn');
    modalTitle.textContent = title || 'Preview';
    modalDesc.textContent = description || '';
    modalCode.textContent = (typeof PREMIUM_SNIPPETS !== 'undefined' && PREMIUM_SNIPPETS[scriptId]) ? PREMIUM_SNIPPETS[scriptId] : '// Premium code preview not available.';
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    modal.focus();

    const closeModal = () => {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (event) => {
      if (event.key === 'Escape') closeModal();
    };

    previewBtn.onclick = () => {
      const expanded = document.getElementById('expandedArea');
      const pre = document.getElementById('expandedCode');
      if (pre) pre.textContent = modalCode.textContent;
      if (expanded) {
        expanded.hidden = false;
        expanded.setAttribute('aria-hidden', 'false');
      }
      closeModal();
    };

    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(modalCode.textContent).then(() => {
          const original = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = original; }, 1200);
        });
      };
    }

    unlockBtn.onclick = () => {
      closeModal();
      if (typeof startPaychanguCheckout === 'function') startPaychanguCheckout(scriptId);
      else alert('Payment flow not available in this environment.');
    };

    const closeButton = document.getElementById('closeModal');
    if (closeButton) closeButton.onclick = closeModal;
    document.addEventListener('keydown', handleEsc);
  }

  window.openPreviewModal = openPreviewModal;

  // Apply previously-unlocked scripts to the UI (features page)
  unlockedScripts.forEach(id => {
    try { unlockScript(id); } catch (e) { /* ignore */ }
  });

  // Resume any pending Paychangu status checks (if user returns after payment)
  resumePendingPaychanguStatus();
})();
