import io
import os

path = os.path.join(os.path.dirname(__file__), 'scripts.js')
with io.open(path, 'r', encoding='utf-8') as f:
    text = f.read()
old = r"""landslide: `// Landslide susceptibility (slope + rainfall placeholder)\nvar dem = ee.Image('USGS/SRTMGL1_003');\nvar slope = ee.Terrain.slope(dem);\nvar susceptible = slope.gt(30);\nMap.addLayer(susceptible.updateMask(susceptible), {palette:['FF6600']}, 'Susceptible Areas');`,

    msi: `// Multi-spectral indices: NDVI, NDWI
"""
new = """    landslide: `// =========================================================================
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

    msi: `// Multi-spectral indices: NDVI, NDWI
"""
if old not in text:
    raise SystemExit('OLD block not found')
text = text.replace(old, new, 1)
with io.open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print('replaced')
