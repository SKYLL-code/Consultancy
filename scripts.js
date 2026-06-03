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
  const PREMIUM_UNLOCK_KEY = 'premiumGEEUnlocked';
  const UNLOCK_DURATION_MS = 90 * 24 * 60 * 60 * 1000;

  function loadPremiumUnlocks() {
    const raw = localStorage.getItem(PREMIUM_UNLOCK_KEY);
    if (!raw) return {};

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.reduce((acc, id) => {
          if (typeof id === 'string') acc[id] = 0;
          return acc;
        }, {});
      }
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to parse premium unlock storage:', error);
    }
    return {};
  }

  function savePremiumUnlocks(unlockedScripts) {
    localStorage.setItem(PREMIUM_UNLOCK_KEY, JSON.stringify(unlockedScripts));
  }

  function isScriptUnlocked(scriptId, unlockedScripts) {
    const expiry = Number(unlockedScripts[scriptId] || 0);
    return expiry > Date.now();
  }

  const unlockedScripts = loadPremiumUnlocks();

  // Premium access helper: only unlock scripts after Paychangu payment.
  // Set `window.FORCE_UNLOCK_PREMIUM = true` for development/testing only.
  if (window.FORCE_UNLOCK_PREMIUM === undefined) window.FORCE_UNLOCK_PREMIUM = false;
  if (window.FORCE_UNLOCK_PREMIUM) {
    document.querySelectorAll('.premium-actions').forEach(span => {
      const id = span.dataset.scriptId;
      if (!id) return;
      span.hidden = false;
      unlockedScripts[id] = Date.now() + UNLOCK_DURATION_MS;
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
    savePremiumUnlocks(unlockedScripts);
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

  function unlockScript(scriptId, expiryTimestamp) {
    const now = Date.now();
    const currentExpiry = Number(unlockedScripts[scriptId] || 0);
    const desiredExpiry = typeof expiryTimestamp === 'number'
      ? expiryTimestamp
      : now + UNLOCK_DURATION_MS;

    if (desiredExpiry > currentExpiry) {
      unlockedScripts[scriptId] = desiredExpiry;
      savePremiumUnlocks(unlockedScripts);
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
    const featureBtn = document.querySelector(`.unlock-btn[data-script-id="${scriptId}"]`);
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
        badge.textContent = 'â³ Verifying...';
      }
      console.log('Payment verification still pending after maximum polling attempts. Waiting silently until verification completes.');
      return;
    }

    try {
      const statusResult = await getPaychanguStatus(txRef);
      console.log(`Poll attempt ${attempts + 1}/${maxAttempts}: Status =`, statusResult);

      if (statusResult.success && statusResult.status === 'verified') {
        unlockScript(scriptId, Date.now() + UNLOCK_DURATION_MS);
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
          badge.textContent = 'âœ“ Unlocked';
          setTimeout(() => {
            badge.textContent = 'ðŸ”“';
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
          badge.textContent = 'âŒ Failed';
          setTimeout(() => {
            badge.textContent = 'ðŸ”’';
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
          unlockScript(scriptId, Date.now() + UNLOCK_DURATION_MS);
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

    drought: `// 1. Define Malawi Study Area
var countries = ee.FeatureCollection("FAO/GAUL/2015/level0");
var malawi = countries.filter(ee.Filter.eq('ADM0_NAME', 'Malawi'));

// 1b. Create Water Mask to exclude Lake Malawi and other water bodies
var waterMask = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select('occurrence');
// Pixels where water occurs less than 10% of the time are kept as land
var landMask = waterMask.lt(10);

// 2. Load, Scale, and Mask MODIS NDVI (MOD13Q1)
var ndviCollection = ee.ImageCollection("MODIS/061/MOD13Q1")
  .filterBounds(malawi)
  .select('NDVI')
  .map(function(img) {
    return img.divide(10000)
              .updateMask(landMask) // <--- This removes the lake artifacts
              .copyProperties(img, ['system:time_start']);
  });

// 3. Historical Baseline (Full Collection)
var ndviMax = ndviCollection.reduce(ee.Reducer.max()).clip(malawi);
var ndviMin = ndviCollection.reduce(ee.Reducer.min()).clip(malawi);

// 4. VCI Calculation Function
var calculateVCI = function(year) {
  var yearNDVI = ndviCollection
    .filter(ee.Filter.calendarRange(year, year, 'year'))
    .median() // Annual median to capture overall health
    .clip(malawi);
    
  var vci = yearNDVI.subtract(ndviMin)
    .divide(ndviMax.subtract(ndviMin))
    .multiply(100)
    .rename('VCI_' + year);
    
  return vci;
};

// 5. Generate Layers for 2005 and 2022
var vci2005 = calculateVCI(2005);
var vci2022 = calculateVCI(2022);

// 6. Classification Logic
// < 20: Extreme | 20-40: Severe | 40-60: Moderate | > 60: Healthy
var classifyVCI = function(image) {
  return image.where(image.lt(20), 1)
              .where(image.gte(20).and(image.lt(40)), 2)
              .where(image.gte(40).and(image.lt(60)), 3)
              .where(image.gte(60), 4);
};

var class2005 = classifyVCI(vci2005);
var class2022 = classifyVCI(vci2022);

// 7. Visualization
var classVis = {
  min: 1, 
  max: 4, 
  palette: ['#8b0000', '#ff4500', '#ffd700', '#006400'] 
};

Map.centerObject(malawi, 6);
Map.addLayer(class2005, classVis, 'Drought Classes Malawi 2005');
Map.addLayer(class2022, classVis, 'Drought Classes Malawi 2022');

// 8. Legend Info
print('Legend: 1 (Maroon)=Extreme, 2 (Orange)=Severe, 3 (Yellow)=Moderate, 4 (Green)=Healthy/Normal');`,

    flood: `// =========================================================================
// 1. DEFINE STUDY AREA (NSANJE DISTRICT, MALAWI)
// =========================================================================
var districts = ee.FeatureCollection("FAO/GAUL/2015/level2");
var nsanje = districts.filter(ee.Filter.and(
  ee.Filter.eq('ADM0_NAME', 'Malawi'),
  ee.Filter.eq('ADM2_NAME', 'Nsanje')
));

Map.centerObject(nsanje, 10);
Map.addLayer(nsanje, {color: 'black', fillOpacity: 0}, 'Nsanje District Boundary');

// =========================================================================
// 2. LOAD AND PROCESS THE 5 RISK FACTORS
// =========================================================================

// --- Factor 1: Elevation ---
var dem = ee.Image("NASA/NASADEM_HGT/001").select('elevation').clip(nsanje);

// --- Factor 2: Slope ---
var slope = ee.Terrain.slope(dem);

// --- Factor 3: Euclidean Distance Multi-Ring Buffer to Rivers (UPDATED) ---
var flowAccumulation = ee.Image("WWF/HydroSHEDS/15ACC").clip(nsanje);
var localRivers = flowAccumulation.gt(100);

// Calculate exact Euclidean Distance from river pixels in meters
var euclideanDistance = localRivers.fastDistanceTransform()
                                    .multiply(ee.Image.pixelArea().sqrt())
                                    .clip(nsanje);

// Create discrete multi-ring buffers using conditional expressions
// Ring 5 (Highest Risk): < 500 meters
// Ring 4: 500m to 1000m
// Ring 3: 1000m to 2000m
// Ring 2: 2000m to 3000m
// Ring 1 (Lowest Risk): > 3000 meters
var rDistMultiRing = ee.Image(1)
  .where(euclideanDistance.lte(3000), 2)
  .where(euclideanDistance.lte(2000), 3)
  .where(euclideanDistance.lte(1000), 4)
  .where(euclideanDistance.lte(500), 5)
  .clip(nsanje)
  .rename('river_risk');

// --- Factor 4: Unsupervised LULC Classification (Sentinel-2 & K-Means) ---
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
           .filterBounds(nsanje)
           .filterDate('2025-01-01', '2025-12-31')
           .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
           .median()
           .clip(nsanje);

var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI');
var trainingImage = s2.select(['B2', 'B3', 'B4', 'B8', 'B11']).addBands(ndvi);

var trainingSample = trainingImage.sample({
  region: nsanje,
  scale: 30,
  numPixels: 5000,
  seed: 42
});

var clusterer = ee.Clusterer.wekaKMeans(5).train(trainingSample);
var unsupervisedLulc = trainingImage.cluster(clusterer);

// --- Factor 5: Precipitation ---
var chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
               .filterBounds(nsanje)
               .filterDate('2023-01-01', '2025-12-31');
var maxRainfall = chirps.select('precipitation').reduce(ee.Reducer.max()).clip(nsanje);

// =========================================================================
// 3. RECLASSIFY AND NORMALIZE REMAINING FACTORS (Scale 1 to 5)
// =========================================================================

function normalizeInverted(image, minVal, maxVal) {
  var normalized = image.subtract(minVal).divide(maxVal - minVal);
  return ee.Image(5).subtract(normalized.multiply(4)).clamp(1, 5);
}

function normalizeDirect(image, minVal, maxVal) {
  return image.subtract(minVal).divide(maxVal - minVal).multiply(4).add(1).clamp(1, 5);
}

var rDem   = normalizeInverted(dem, 30, 200);
var rSlope = normalizeInverted(slope, 0, 5);
var rRain  = normalizeDirect(maxRainfall, 40, 120);

// Reclassify Unsupervised LULC based on structural landscape risks
var rLulc  = unsupervisedLulc.remap([0, 1, 2, 3, 4], [4, 2, 5, 1, 3]).rename('label');

// =========================================================================
// 4. MULTI-CRITERIA WEIGHTED OVERLAY
// =========================================================================
// Integrating the multi-ring buffered raster directly into our model calculation
var floodRiskMap = ee.Image(rDem).multiply(0.30)
                     .add(ee.Image(rSlope).multiply(0.20))
                     .add(ee.Image(rDistMultiRing).multiply(0.20)) // 20% weight to river proximity rings
                     .add(ee.Image(rLulc).multiply(0.15))
                     .add(ee.Image(rRain).multiply(0.15));

// =========================================================================
// 5. MAPPING AND VISUALIZATION
// =========================================================================
var factorPalette = ['#257d3e', '#e7cf24', '#bf311a']; // Green (Low Risk) to Red (High Risk)
var riskPalette = ['#2b83ba', '#abdda4', '#ffffbf', '#fdae61', '#d7191c']; // Blue to Red Cluster

// 1. Elevation Factor
Map.addLayer(rDem, {min: 1, max: 5, palette: factorPalette}, 'Factor 1: Elevation Risk', false);

// 2. Slope Factor
Map.addLayer(rSlope, {min: 1, max: 5, palette: factorPalette}, 'Factor 2: Slope Risk', false);

// 3. Euclidean Multi-Ring Distance Factor
Map.addLayer(rDistMultiRing, {min: 1, max: 5, palette: ['#31a354', '#a1d99b', '#fec44f', '#fe9929', '#d95f02']}, 'Factor 3: River Multi-Ring Risk Zones', true);
Map.addLayer(localRivers.updateMask(localRivers), {palette: ['#045a8d']}, 'Vectorized Flow Channels', false);

// 4. Unsupervised LULC Factors
Map.addLayer(unsupervisedLulc, {min: 0, max: 4, palette: ['blue', 'green', 'red', 'darkgreen', 'yellow']}, 'Factor 4: Raw Unsupervised Clusters', false);
Map.addLayer(rLulc, {min: 1, max: 5, palette: factorPalette}, 'Factor 4: LULC Runoff Risk', false);

// 5. Precipitation Factor
Map.addLayer(rRain, {min: 1, max: 5, palette: factorPalette}, 'Factor 5: Rainfall Intensity Risk', false);

// 6. Output Final Risk Model Map
Map.addLayer(floodRiskMap, {min: 1, max: 5, palette: riskPalette}, 'FINAL FLOOD RISK MAP', true);

// =========================================================================
// 6. LEGEND GENERATION
// =========================================================================
var legend = ui.Panel({style: {position: 'bottom-left', padding: '8px 15px'}});
var legendTitle = ui.Label({value: 'Flood Risk Level', style: {fontWeight: 'bold', fontSize: '14px', margin: '0 0 4px 0'}});
legend.add(legendTitle);

var makeRow = function(color, name) {
  var colorBox = ui.Label({style: {backgroundColor: color, padding: '8px', margin: '0 6px 0 0'}});
  var description = ui.Label({value: name, style: {margin: '0 0 4px 0'}});
  return ui.Panel({widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal')});
};

legend.add(makeRow('#2b83ba', 'Very Low Risk'));
legend.add(makeRow('#abdda4', 'Low Risk'));
legend.add(makeRow('#ffffbf', 'Moderate Risk'));
legend.add(makeRow('#fdae61', 'High Risk'));
legend.add(makeRow('#d7191c', 'Very High Risk'));
Map.add(legend);`,

    landslide: `// =========================================================================
// 1. DEFINE STUDY AREA (NSANJE DISTRICT, MALAWI)
// =========================================================================
var districts = ee.FeatureCollection("FAO/GAUL/2015/level2");
var nsanje = districts.filter(ee.Filter.and(
  ee.Filter.eq('ADM0_NAME', 'Malawi'),
  ee.Filter.eq('ADM2_NAME', 'Nsanje')
));

Map.centerObject(nsanje, 10);
Map.addLayer(nsanje, {color: 'black', fillOpacity: 0}, 'Nsanje District Boundary');

// =========================================================================
// 2. LOAD AND PROCESS THE 5 LANDSLIDE FACTORS
// =========================================================================

// --- Factor 1: Elevation ---
var dem = ee.Image("NASA/NASADEM_HGT/001").select('elevation').clip(nsanje);

// --- Factor 2: Slope ---
var slope = ee.Terrain.slope(dem);

// --- Factor 3: Aspect (Direction of Slope) ---
var aspect = ee.Terrain.aspect(dem);

// --- Factor 4: Profile Curvature (Approximated via second derivative of DEM) ---
// In GEE, curvature can be calculated using a moving nuclear window or neighborhood gradients
var xyDerivatives = dem.gradient();
var xDeriv = xyDerivatives.select('x');
var yDeriv = xyDerivatives.select('y');
var curvature = xDeriv.gradient().select('x').add(yDeriv.gradient().select('y')).rename('curvature');

// --- Factor 5: Unsupervised LULC (Sentinel-2 & K-Means) ---
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
           .filterBounds(nsanje)
           .filterDate('2025-01-01', '2025-12-31')
           .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
           .median()
           .clip(nsanje);

var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI');
var trainingImage = s2.select(['B2', 'B3', 'B4', 'B8', 'B11']).addBands(ndvi);

var trainingSample = trainingImage.sample({
  region: nsanje,
  scale: 30,
  numPixels: 5000,
  seed: 24
});

var clusterer = ee.Clusterer.wekaKMeans(5).train(trainingSample);
var unsupervisedLulc = trainingImage.cluster(clusterer);

// =========================================================================
// 3. NORMALIZE AND RECLASSIFY FACTORS (Scale 1 to 5: 1=Low Risk, 5=High Risk)
// =========================================================================

function normalizeDirect(image, minVal, maxVal) {
  return image.subtract(minVal).divide(maxVal - minVal).multiply(4).add(1).clamp(1, 5);
}

// Normalize Elevation (Direct: Higher elevations in Nsanje point to the rocky escarpments)
var rDem = normalizeDirect(dem, 30, 500);

// Normalize Slope (Direct: Steeper slopes = much higher risk. 0 to 35+ degrees)
var rSlope = normalizeDirect(slope, 0, 35);

// Reclassify Aspect: South and East facing slopes in Southern Malawi catch heavy structural 
// moisture from Indian Ocean systems/cyclones, increasing risk due to saturation.
var rAspect = ee.Image(1)
  .where(aspect.gt(45).and(aspect.lte(135)), 3)
  .where(aspect.gt(135).and(aspect.lte(225)), 5)
  .where(aspect.gt(225).and(aspect.lte(315)), 2)
  .where(aspect.gt(315).or(aspect.lte(45)), 1)
  .clip(nsanje);

// Reclassify Curvature: Concave surfaces (negative values) accumulate water and track slide paths
var rCurvature = ee.Image(3)
  .where(curvature.lt(-0.05), 5)
  .where(curvature.gt(0.05), 1)
  .clip(nsanje);

// Reclassify Unsupervised LULC: Bare ground and steep agricultural fields get high risk (4-5)
var rLulc = unsupervisedLulc.remap([0, 1, 2, 3, 4], [2, 5, 1, 4, 3]).rename('label');

// =========================================================================
// 4. MULTI-CRITERIA WEIGHTED OVERLAY
// =========================================================================
// Slope is the dominant driver for landslides, followed by curvature and asset structural integrity
var landslideSusceptibility = ee.Image(rSlope).multiply(0.35)
                               .add(ee.Image(rCurvature).multiply(0.20))
                               .add(ee.Image(rDem).multiply(0.15))
                               .add(ee.Image(rAspect).multiply(0.15))
                               .add(ee.Image(rLulc).multiply(0.15));

// =========================================================================
// 5. MAPPING AND VISUALIZATION (ALL LAYERS)
// =========================================================================
var factorPalette = ['#1a9641', '#a6d96a', '#fdae61', '#d7191c']; // Green to Red
var LS_Palette = ['#005a32', '#74c476', '#fed98e', '#fe9929', '#cc4c02']; // Custom Landslide theme

// 1. Map Elevation Risk
Map.addLayer(rDem, {min: 1, max: 5, palette: factorPalette}, 'Factor 1: Elevation Susceptibility', false);

// 2. Map Slope Risk (The most critical factor)
Map.addLayer(rSlope, {min: 1, max: 5, palette: factorPalette}, 'Factor 2: Slope Susceptibility', false);

// 3. Map Aspect Risk
Map.addLayer(rAspect, {min: 1, max: 5, palette: factorPalette}, 'Factor 3: Aspect Susceptibility', false);

// 4. Map Curvature Risk
Map.addLayer(rCurvature, {min: 1, max: 5, palette: factorPalette}, 'Factor 4: Curvature Susceptibility', false);

// 5. Map Unsupervised LULC Risk
Map.addLayer(rLulc, {min: 1, max: 5, palette: factorPalette}, 'Factor 5: LULC Stability Susceptibility', false);

// 6. Map Final Susceptibility Output
Map.addLayer(landslideSusceptibility, {min: 1, max: 5, palette: LS_Palette}, 'LANDSLIDE SUSCEPTIBILITY MAP', true);

// =========================================================================
// 6. LEGEND GENERATION
// =========================================================================
var legend = ui.Panel({style: {position: 'bottom-left', padding: '8px 15px'}});
var legendTitle = ui.Label({value: 'Landslide Susceptibility', style: {fontWeight: 'bold', fontSize: '14px', margin: '0 0 4px 0'}});
legend.add(legendTitle);

var makeRow = function(color, name) {
  var colorBox = ui.Label({style: {backgroundColor: color, padding: '8px', margin: '0 6px 0 0'}});
  var description = ui.Label({value: name, style: {margin: '0 0 4px 0'}});
  return ui.Panel({widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal')});
};

legend.add(makeRow('#005a32', 'Very Low'));
legend.add(makeRow('#74c476', 'Low'));
legend.add(makeRow('#fed98e', 'Moderate'));
legend.add(makeRow('#fe9929', 'High'));
legend.add(makeRow('#cc4c02', 'Very High'));
Map.add(legend);`,

    msi: `// =========================================================================
// 1. DEFINE STUDY AREA (CENTRAL REGION, MALAWI)
// =========================================================================
// Load international administrative boundaries (Level 1 for regions)
var regions = ee.FeatureCollection("FAO/GAUL/2015/level1");
var centralMalawi = regions.filter(ee.Filter.and(
  ee.Filter.eq('ADM0_NAME', 'Malawi'),
  ee.Filter.eq('ADM1_NAME', 'Central Region')
));

// Center the map view on Central Region
Map.centerObject(centralMalawi, 8);
Map.addLayer(centralMalawi, {color: 'black', fillOpacity: 0}, 'Central Region Boundary');

// =========================================================================
// 2. LOAD AND MEDIAN-COMPOSITE SENTINEL-2 IMAGERY (2024)
// =========================================================================
var s2Comp = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
               .filterBounds(centralMalawi)
               .filterDate('2024-01-01', '2024-12-31')
               // Filter out heavy cloud cover scenes
               .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 15))
               .median()
               .clip(centralMalawi);

// Add a standard True Color layer for visual baseline reference
var trueColorVis = {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000};
Map.addLayer(s2Comp, trueColorVis, 'Sentinel-2 True Color (2024)', false);

// =========================================================================
// 3. CALCULATE THE 5 MULTI-SPECTRAL INDICES
// =========================================================================

// --- Index 1: Normalized Difference Vegetation Index (NDVI) ---
// Formula: (NIR - Red) / (NIR + Red) -> (B8 - B4) / (B8 + B4)
var ndvi = s2Comp.normalizedDifference(['B8', 'B4']).rename('NDVI');

// --- Index 2: Normalized Difference Water Index (NDWI) ---
// Formula: (Green - NIR) / (Green + NIR) -> (B3 - B8) / (B3 + B8)
var ndwi = s2Comp.normalizedDifference(['B3', 'B8']).rename('NDWI');

// --- Index 3: Normalized Difference Moisture Index (NDMI) ---
// Formula: (NIR - SWIR1) / (NIR + SWIR1) -> (B8 - B11) / (B8 + B11)
var ndmi = s2Comp.normalizedDifference(['B8', 'B11']).rename('NDMI');

// --- Index 4: Normalized Burn Ratio (NBR) ---
// Formula: (NIR - SWIR2) / (NIR + SWIR2) -> (B8 - B12) / (B8 + B12)
var nbr = s2Comp.normalizedDifference(['B8', 'B12']).rename('NBR');

// --- Index 5: Normalized Difference Built-Up Index (NDBI) ---
// Formula: (SWIR1 - NIR) / (SWIR1 + NIR) -> (B11 - B8) / (B11 + B8)
var ndbi = s2Comp.normalizedDifference(['B11', 'B8']).rename('NDBI');

// =========================================================================
// 4. MAP AND VISUALIZE ALL LAYERS
// =========================================================================

// Palettes optimized for typical interpretation boundaries
var vegPalette   = ['#FFFFFF', '#CE7E3B', '#E1CD73', '#8B9816', '#2C4B13'];
var waterPalette = ['#E0FBFC', '#98C1D9', '#3D5A80', '#293241', '#03045E'];
var moistPalette = ['#f7fbff', '#9ecae1', '#4292c6', '#084594'];
var burnPalette  = ['#7a0177', '#c994c7', '#f7fcf5', '#41ab5d', '#00441b'];
var urbanPalette = ['#e0ecf4', '#9ebcda', '#8856a7', '#810f7c'];

// Add individual processed layers to interactive display panel
Map.addLayer(ndvi, {min: -0.1, max: 0.8, palette: vegPalette}, '1. NDVI (Vegetation Index)', true);
Map.addLayer(ndwi, {min: -0.5, max: 0.3, palette: waterPalette}, '2. NDWI (Water Index)', false);
Map.addLayer(ndmi, {min: -0.2, max: 0.6, palette: moistPalette}, '3. NDMI (Moisture Index)', false);
Map.addLayer(nbr,  {min: -0.4, max: 0.7, palette: burnPalette},  '4. NBR (Burn Ratio)', false);
Map.addLayer(ndbi, {min: -0.3, max: 0.4, palette: urbanPalette}, '5. NDBI (Built-Up Index)', false);

// =========================================================================
// 5. BONUS: EXPORT DATA TO GOOGLE DRIVE (Optional execution)
// =========================================================================
// To download any asset layer, uncomment the block below and run via the Tasks Tab.
/*
Export.image.toDrive({
  image: ndvi,
  description: 'Central_Malawi_NDVI_2024',
  scale: 10,
  region: centralMalawi,
  maxPixels: 1e13
});
*/`,

    rusle: `/***********************************************************************
   RUSLE Soil Erosion Model
   Study Area: Northern Region, Malawi
   Years: 1995, 2005, 2015, 2025
***********************************************************************/

// ==========================================
// 1. Study Area (NORTHERN MALAWI)
// ==========================================
// Using level1 for regional boundaries instead of level2 (districts)
var regions = ee.FeatureCollection("FAO/GAUL/2015/level1");

var studyArea = regions
  .filter(ee.Filter.eq('ADM0_NAME', 'Malawi'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Northern Region')); 

Map.centerObject(studyArea, 8);
Map.addLayer(studyArea, {color: 'red', fillOpacity: 0}, 'Study Area: Northern Malawi', true);

// ==========================================
// 2. Compute Soil Loss Function
// ==========================================
var computeSoilLoss = function(year) {
  var startDate = ee.Date.fromYMD(year, 1, 1);
  var endDate = ee.Date.fromYMD(year, 12, 31);

  // R Factor: Rainfall Erosivity (CHIRPS)
  var rainfall = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
    .filterDate(startDate, endDate)
    .sum()
    .clip(studyArea);
  var R = rainfall.multiply(0.5).rename('R');

  // K Factor: Soil Erodibility
  var K = ee.Image.constant(0.03).clip(studyArea).rename('K');

  // LS Factor: Slope Length and Steepness (SRTM)
  var elevation = ee.Image("USGS/SRTMGL1_003").clip(studyArea);
  var slope = ee.Terrain.slope(elevation);
  var LS = slope.divide(9).pow(1.3).rename('LS');

  // C Factor: Cover Management (FIXED: Improved Landsat 8/9 harmonized mapping for 2025)
  var lSat;
  var ndvi;

  if (year < 2012) {
    // Legacy Landsat 5
    lSat = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2")
      .filterBounds(studyArea)
      .filterDate(startDate, endDate)
      .filter(ee.Filter.lt('CLOUD_COVER', 30))
      .median()
      .clip(studyArea);
    
    ndvi = lSat.normalizedDifference(['SR_B4', 'SR_B3']).rename('NDVI');
  } else {
    // Combined Landsat 8 and Landsat 9 to prevent missing data masks over Northern mountains/lake boundaries
    var l8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").filterDate(startDate, endDate).filterBounds(studyArea);
    var l9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2").filterDate(startDate, endDate).filterBounds(studyArea);
    
    lSat = l8.merge(l9)
      .filter(ee.Filter.lt('CLOUD_COVER', 30))
      .median()
      .clip(studyArea);
      
    ndvi = lSat.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  }

  // Scaling C factor based on standard NDVI parameters
  var C = ee.Image.constant(1).subtract(ndvi).rename('C');

  // P Factor: Support Practice
  var P = ee.Image.constant(1).clip(studyArea).rename('P');

  // RUSLE Equation: A = R * K * LS * C * P
  return R.multiply(K).multiply(LS).multiply(C).multiply(P).rename('SoilLoss_' + year);
};

// ==========================================
// 3. Execution & Visualization
// ==========================================
var years = [1995, 2005, 2015, 2025];
var visParams = {min: 0, max: 50, palette: ['green', 'yellow', 'orange', 'red', 'darkred']};

years.forEach(function(year) {
  var result = computeSoilLoss(year);
  Map.addLayer(result, visParams, 'Soil Erosion Risk ' + year, false); // Layers added as unchecked by default to save memory footprint
  
  // Export to Drive
  Export.image.toDrive({
    image: result,
    description: 'NorthernMalawi_RUSLE_' + year,
    scale: 30,
    region: studyArea.geometry(),
    maxPixels: 1e13
  });
});`
  };

  // Overwrite `hydro` snippet with the exact Nile flood-depth code provided by the user.
  // This preserves the earlier placeholder while ensuring the preview and copy use the exact text.
  PREMIUM_SNIPPETS.hydro = `/**
 * =========================================================================
 * ADVANCED SIDE-BY-SIDE FLOOD DEPTH MAPPING FOR THE NILE RIVER
 * Dataset: JRC Global River Flood Hazard Maps (GloFAS v2.1)
 * Features: Interactive Split-Screen Slider Layout & Automated Drive Export
 * =========================================================================
 */

// 1. DEFINE NILE RIVER STUDY AREA BOUNDS (Khartoum Convergence Region)
var AOI = ee.Geometry.Polygon([[ 
  [32.20, 15.20],
  [33.10, 15.20],
  [33.10, 16.00],
  [32.20, 16.00]
]]);

// 2. LOAD THE UPDATED GLOFAS V2.1 IMAGE 
// Version 2.1 contains all return periods as separate bands inside an ImageCollection
var glofasCollection = ee.ImageCollection('JRC/CEMS_GLOFAS/FloodHazard/v2_1')
  .filterBounds(AOI);

// Mosaic and clip the collection to the area of interest
var glofasImage = glofasCollection.mosaic().clip(AOI);

// Extract targeted flood hazard bands and mask out dry areas (less than 1 cm)
var depth10  = glofasImage.select('RP10_depth').updateMask(glofasImage.select('RP10_depth').gt(0.01));
var depth100 = glofasImage.select('RP100_depth').updateMask(glofasImage.select('RP100_depth').gt(0.01));

// 3. COLOR PALETTES & VISUALIZATION PARAMETERS
var depthPalette = ['#dbf3fa', '#abd9e9', '#74add1', '#4575b4', '#313695', '#081d58'];
var visParams = {
  min: 0.0,
  max: 6.0, // Maximum visualization depth scaled to 6 meters
  palette: depthPalette
};

// 4. GENERATE THE SUPER USER INTERFACE (SPLIT-SCREEN SLIDER)
// Create separate map windows
var leftMap = ui.Map();
var rightMap = ui.Map();

// Sync the views so zooming or dragging on one updates the other automatically
var linker = ui.Map.Linker([leftMap, rightMap]);

// Configure basemaps
leftMap.setOptions('SATELLITE');
rightMap.setOptions('SATELLITE');

// Build the splitting UI component
var splitPanel = ui.SplitPanel({
  firstPanel: leftMap,
  secondPanel: rightMap,
  orientation: 'horizontal',
  wipe: true,
  style: {stretch: 'both'}
});

// Clear the default main script map viewport and embed our custom split panel
ui.root.clear();
ui.root.add(splitPanel);

// Add data layers to respective map panels
leftMap.addLayer(depth10, visParams, '10-Year Flood Depth');
rightMap.addLayer(depth100, visParams, '100-Year Flood Depth');

// Add study boundary outline to both viewports
var outline = ee.Image().paint({featureCollection: ee.FeatureCollection([ee.Feature(AOI)]), color: 1, width: 2});
leftMap.addLayer(outline, {palette: ['#ff4d4d']}, 'Study Area Border');
rightMap.addLayer(outline, {palette: ['#ff4d4d']}, 'Study Area Border');

// Center both panels on the Nile River study site
leftMap.centerObject(AOI, 10);

// 5. EMBED STYLED UI DESCRIPTIVE LABELS
var leftLabel = ui.Label({
  value: 'â¬… Low-Interval/Frequent Flood Hazard (10-Year RP)',
  style: {position: 'top-left', padding: '8px', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.8)'}
});
leftMap.add(leftLabel);

var rightLabel = ui.Label({
  value: 'High-Severity/Extreme Flood Hazard (100-Year RP) âž¡',
  style: {position: 'top-right', padding: '8px', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.8)'}
});
rightMap.add(rightLabel);

// 6. BUILD COLOR BAR LEGEND CARD
var legendPanel = ui.Panel({
  style: {position: 'bottom-left', padding: '8px 15px', backgroundColor: 'white'}
});
var legendTitle = ui.Label({
  value: 'Water Depth (m)',
  style: {fontWeight: 'bold', fontSize: '14px', margin: '0 0 6px 0'}
});
legendPanel.add(legendTitle);

// Create legend color scale strip
var lon = ee.Image.pixelLonLat().select('longitude');
var gradient = lon.multiply(0).add(1);
var legendImage = gradient.visualize(visParams);

var thumbnail = ui.Thumbnail({
  image: legendImage,
  params: {bbox: '0,0,10,100', dimensions: '160x15', format: 'png'},
  style: {padding: '1px', margin: '0 0 4px 0'}
});
legendPanel.add(thumbnail);

// Label layout for the text scale underneath the color bar strip
var labelPanel = ui.Panel({
  widgets: [
    ui.Label('0m', {fontSize: '11px'}),
    ui.Label('3m', {fontSize: '11px', textAlign: 'center', stretch: 'horizontal'}),
    ui.Label('6m+', {fontSize: '11px'})
  ],
  layout: ui.Panel.Layout.Flow('horizontal')
});
legendPanel.add(labelPanel);
leftMap.add(legendPanel);

// 7. COMPUTE DATA HISTOGRAM
var floodHistogram = ui.Chart.image.histogram({
  image: depth100,
  region: AOI,
  scale: 90, // Scale optimized to the higher 90m native resolution of v2.1
  maxBuckets: 25
}).setOptions({
  title: 'Nile Segment: 100-Year Flood Depth Profile Metric',
  hAxis: {title: 'Inundation Scale (Meters)', titleTextStyle: {bold: true}},
  vAxis: {title: 'Pixel Density'},
  colors: ['#081d58']
});
print('Statistical Histogram Plot:', floodHistogram);

// 8. DATA OUTPUT BUNDLES (AUTOMATED TASKS WINDOW TRIGGERS)
Export.image.toDrive({
  image: depth10,
  description: 'Nile_River_Flood_Depth_10Year',
  folder: 'Nile_Flood_Analysis',
  region: AOI,
  scale: 90,
  crs: 'EPSG:4326'
});

Export.image.toDrive({
  image: depth100,
  description: 'Nile_River_Flood_Depth_100Year',
  folder: 'Nile_Flood_Analysis',
  region: AOI,
  scale: 90,
  crs: 'EPSG:4326'
});`;
  // Make snippets available globally for inline page scripts (features.html)
  window.PREMIUM_SNIPPETS = PREMIUM_SNIPPETS;

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
  Object.keys(unlockedScripts).forEach(id => {
    if (isScriptUnlocked(id, unlockedScripts)) {
      try { unlockScript(id); } catch (e) { /* ignore */ }
    } else {
      delete unlockedScripts[id];
    }
  });
  savePremiumUnlocks(unlockedScripts);

  // Resume any pending Paychangu status checks (if user returns after payment)
  resumePendingPaychanguStatus();
})();

(function() {
  const ttsText = document.getElementById('ttsText');
  const ttsReadBtn = document.getElementById('ttsReadBtn');
  const ttsDownloadBtn = document.getElementById('ttsDownloadBtn');
  const ttsStatus = document.getElementById('ttsStatus');
  const ttsSpeed = document.getElementById('ttsSpeed');
  const ttsSpeedValue = document.getElementById('ttsSpeedValue');
  const ttsBackBtn = document.getElementById('ttsBackBtn');

  function getTextToSpeechSettings() {
    const gender = document.getElementById('voiceGender')?.value || 'male';
    const style = document.getElementById('voiceStyle')?.value || 'neutral';
    let pitch = gender === 'female' ? 1.2 : 0.8;
    let rate = Number(ttsSpeed?.value) || 1.0;
    let volume = 1.0;

    switch (style) {
      case 'deep':
        pitch -= 0.2;
        break;
      case 'soft':
        pitch += 0.18;
        volume = 0.92;
        break;
      case 'warm':
        pitch += 0.08;
        rate *= 0.95;
        break;
      case 'bright':
        pitch += 0.25;
        rate *= 1.05;
        break;
      case 'calm':
        pitch -= 0.1;
        rate *= 0.88;
        volume = 0.93;
        break;
      case 'energetic':
        pitch += 0.3;
        rate *= 1.2;
        break;
      case 'smooth':
        pitch += 0.05;
        rate *= 0.96;
        break;
      case 'dramatic':
        pitch -= 0.05;
        rate *= 0.96;
        break;
      case 'classic':
        pitch += 0.0;
        rate *= 0.98;
        break;
      default:
        break;
    }

    return {
      gender,
      pitch: Math.min(Math.max(pitch, 0.5), 2),
      rate: Math.min(Math.max(rate, 0.6), 2),
      volume: Math.min(Math.max(volume, 0.4), 1),
      style
    };
  }

  function updateTtsStatus(message, isError = false) {
    if (!ttsStatus) return;
    ttsStatus.textContent = message;
    ttsStatus.style.color = isError ? '#d0262f' : '#0b7a6f';
  }

  function speakText() {
    const text = ttsText?.value.trim();
    if (!text) {
      updateTtsStatus('Please type or paste text to convert.', true);
      return;
    }

    if (!('speechSynthesis' in window)) {
      updateTtsStatus('Speech playback is not supported in this browser.', true);
      return;
    }

    const settings = getTextToSpeechSettings();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = settings.pitch;
    utterance.rate = settings.rate;
    utterance.volume = settings.volume;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      const search = settings.gender === 'female'
        ? /female|woman|girl/i
        : /male|man|boy/i;
      const match = voices.find(v => search.test(`${v.name} ${v.voiceURI} ${v.lang}`));
      if (match) utterance.voice = match;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    updateTtsStatus('Playing audio now...');
  }

  function downloadTextAudio() {
    const text = ttsText?.value.trim();
    if (!text) {
      updateTtsStatus('Please type or paste text to convert.', true);
      return;
    }

    if (!(window.meSpeak && typeof meSpeak.getWavFile === 'function')) {
      updateTtsStatus('Download requires the free browser speech library. Please reload the page.', true);
      return;
    }

    const settings = getTextToSpeechSettings();
    const options = {
      amplitude: Math.round(settings.volume * 100),
      pitch: Math.round(settings.pitch * 50),
      wordgap: 0,
      speed: Math.round(settings.rate * 180),
      voice: 'en/en-us'
    };

    updateTtsStatus('Generating downloadable audio...');
    try {
      const wavData = meSpeak.getWavFile(text, options);
      const blob = new Blob([new Uint8Array(wavData)], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'text-to-audio.wav';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      updateTtsStatus('Download started. Your audio file is ready.');
    } catch (error) {
      console.error('Text to audio download failed:', error);
      updateTtsStatus('Could not generate the audio file. Please try again.', true);
    }
  }

  function toggleTextToAudioPanel(open) {
    const panel = document.getElementById('text-to-audio');
    const showBtn = document.getElementById('showTextToAudioBtn');
    let backdrop = document.getElementById('ttsBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'ttsBackdrop';
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click', () => toggleTextToAudioPanel(false));
    }
    if (!panel) return;
    if (open) {
      panel.classList.remove('audio-ai-hidden');
      panel.classList.add('audio-ai-visible');
      panel.setAttribute('aria-hidden', 'false');
      if (showBtn) showBtn.hidden = true;
      backdrop.classList.add('backdrop-visible');
      document.body.classList.add('modal-open');
      _addScrollRouting();
      // focus first interactive element for accessibility
      const first = panel.querySelector('textarea, button, select, input');
      if (first) first.focus();
      window.setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } else {
      panel.classList.remove('audio-ai-visible');
      panel.classList.add('audio-ai-hidden');
      panel.setAttribute('aria-hidden', 'true');
      if (showBtn) showBtn.hidden = false;
      backdrop.classList.remove('backdrop-visible');
      document.body.classList.remove('modal-open');
      _removeScrollRouting();
    }
  }

  // --- Route background wheel/touch to modal when open and prevent body scroll ---
  let _touchStartY = null;
  function _onWheel(e) {
    const panel = document.getElementById('text-to-audio');
    if (!panel) return;
    // If the wheel event target is inside the panel, allow default so inner scroll works
    if (panel.contains(e.target)) return;
    // Otherwise, prevent body scroll and scroll the panel instead
    e.preventDefault();
    panel.scrollTop += e.deltaY;
  }

  function _onTouchStart(e) {
    if (!e.touches || !e.touches.length) return;
    _touchStartY = e.touches[0].clientY;
  }

  function _onTouchMove(e) {
    const panel = document.getElementById('text-to-audio');
    if (!panel) return;
    if (!e.touches || !e.touches.length) return;
    const y = e.touches[0].clientY;
    // If the touch started inside the panel, allow normal modal scrolling
    if (panel.contains(document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY))) return;
    if (_touchStartY === null) {
      _touchStartY = y;
      return;
    }
    const delta = _touchStartY - y;
    if (Math.abs(delta) > 2) {
      e.preventDefault();
      panel.scrollTop += delta;
      _touchStartY = y;
    }
  }

  function _addScrollRouting() {
    document.addEventListener('wheel', _onWheel, { passive: false, capture: true });
    document.addEventListener('touchstart', _onTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', _onTouchMove, { passive: false, capture: true });
  }

  function _removeScrollRouting() {
    document.removeEventListener('wheel', _onWheel, { capture: true });
    document.removeEventListener('touchstart', _onTouchStart, { capture: true });
    document.removeEventListener('touchmove', _onTouchMove, { capture: true });
    _touchStartY = null;
  }

  function bindTextToAudioUI() {
    if (ttsReadBtn) ttsReadBtn.addEventListener('click', speakText);
    if (ttsDownloadBtn) ttsDownloadBtn.addEventListener('click', downloadTextAudio);
    if (ttsSpeed && ttsSpeedValue) {
      ttsSpeed.addEventListener('input', () => {
        ttsSpeedValue.textContent = \`\${parseFloat(ttsSpeed.value).toFixed(1)}x\`;
      });
    }
    if (ttsBackBtn) {
      ttsBackBtn.addEventListener('click', () => toggleTextToAudioPanel(false));
    }
    const ttsClose = document.getElementById('ttsCloseBtn');
    if (ttsClose) ttsClose.addEventListener('click', () => toggleTextToAudioPanel(false));
    // Close on Escape
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') toggleTextToAudioPanel(false);
    });
    const showBtn = document.getElementById('showTextToAudioBtn');
    if (showBtn) {
      showBtn.setAttribute('aria-expanded', 'false');
      showBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const willOpen = showBtn.getAttribute('aria-expanded') !== 'true';
        toggleTextToAudioPanel(willOpen);
        showBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    }
  }

  if (document.readyState !== 'loading') {
    bindTextToAudioUI();
  } else {
    document.addEventListener('DOMContentLoaded', bindTextToAudioUI);
  }
})();


