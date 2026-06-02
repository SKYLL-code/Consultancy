from pathlib import Path

path = Path('features.html')
text = path.read_text(encoding='utf-8')
prefix = "river: dedent`"
suffix = "`\n    };"
start = text.index(prefix)
end = text.index(suffix, start) + len(suffix)
replacement = '''river: dedent`// =========================================================================
// 1. BOUNDING GEOMETRY & RIVER GEOMETRY INGESTION
// =========================================================================

// Load Malawi baseline boundaries to isolate the local river network
var malawi_aoi = ee.FeatureCollection("FAO/GAUL/2015/level0")
  .filter(ee.Filter.eq('ADM0_NAME', 'Malawi'));

// Load the global WWF HydroSHEDS Free Flowing Rivers collection
var global_rivers = ee.FeatureCollection("WWF/HydroSHEDS/v1/FreeFlowingRivers");

// Filter the dataset to isolate reaches falling within or intersecting Malawi
var malawi_rivers = global_rivers.filterBounds(malawi_aoi);

// =========================================================================
// 2. MAP VISUALIZATION BY RIVER ORDER (Distinct Levels & Line Weights)
// =========================================================================
Map.setOptions('SATELLITE');
Map.centerObject(malawi_aoi, 7);

// Initialize a blank image canvas for crisp vector line styling
var canvas = ee.Image().byte();

// Isolate and paint each river order level present in the region
// Level 4: Major Rivers / Primary Discharges (e.g., Lower Shire Main Stem)
var r_order4 = malawi_rivers.filter(ee.Filter.eq('RIV_ORD', 4));
Map.addLayer(canvas.paint({featureCollection: r_order4, color: 1, width: 4.5}), {palette: '0000FF'}, 'Level 4: Major Channels (Blue)');

// Level 5: Large Tributaries / Regional Core Drainage
var r_order5 = malawi_rivers.filter(ee.Filter.eq('RIV_ORD', 5));
Map.addLayer(canvas.paint({featureCollection: r_order5, color: 1, width: 3.5}), {palette: '00FFFF'}, 'Level 5: Large Tributaries (Cyan)');

// Level 6: Medium Regional Rivers
var r_order6 = malawi_rivers.filter(ee.Filter.eq('RIV_ORD', 6));
Map.addLayer(canvas.paint({featureCollection: r_order6, color: 1, width: 2.5}), {palette: '00FF00'}, 'Level 6: Medium Streams (Green)');

// Level 7: Minor Tributaries / Standard Creeks
var r_order7 = malawi_rivers.filter(ee.Filter.eq('RIV_ORD', 7));
Map.addLayer(canvas.paint({featureCollection: r_order7, color: 1, width: 1.8}), {palette: 'FFFF00'}, 'Level 7: Minor Creeks (Yellow)');

// Level 8: Local Headwaters / Small Valley Brooks
var r_order8 = malawi_rivers.filter(ee.Filter.eq('RIV_ORD', 8));
Map.addLayer(canvas.paint({featureCollection: r_order8, color: 1, width: 1.2}), {palette: 'FFA500'}, 'Level 8: Small Brooks (Orange)');

// Level 9: Micro-Drainage Channels
var r_order9 = malawi_rivers.filter(ee.Filter.eq('RIV_ORD', 9));
Map.addLayer(canvas.paint({featureCollection: r_order9, color: 1, width: 0.8}), {palette: 'FF00FF'}, 'Level 9: Micro Channels (Magenta)');

// Level 10: Hyper-Local Sinks / Headwater Seeps
var r_order10 = malawi_rivers.filter(ee.Filter.eq('RIV_ORD', 10));
Map.addLayer(canvas.paint({featureCollection: r_order10, color: 1, width: 0.5}), {palette: 'FF0000'}, 'Level 10: Seeps & Runoff (Red)');


// =========================================================================
// 3. PROPERTY SELECTION & TASK SHAPEFILE EXPORT
// =========================================================================

// Select key HydroSHEDS tracking codes for export:
// 'RIV_ORD'   = Flow volume code classification level
// 'RIV_ID'    = Absolute unique feature identifier for the reach segment
// 'DIS_AV_CMS'= Long-term average discharge rate in cubic meters per second
// 'UPLND_SKM' = Total cumulative drainage area upstream in square kilometers
// 'HYBAS_L12' = Co-registered code pointing directly to the Level 12 HydroBASIN polygon
var river_selectors = ['RIV_ORD', 'RIV_ID', 'DIS_AV_CMS', 'UPLND_SKM', 'HYBAS_L12'];

var export_collection = malawi_rivers.select(river_selectors);

// Export the complete, structured multi-level network as a Shapefile bundle
Export.table.toDrive({
  collection: export_collection,
  description: 'Malawi_HydroSHEDS_Rivers_All_Levels',
  fileFormat: 'SHP',
  selectors: river_selectors
});

// View a metadata preview inside the console panel
print("Sample River Segment Attributes (SHP Schema):", export_collection.limit(5));`'''
text = text[:start] + replacement + text[end:]
path.write_text(text, encoding='utf-8')
print('Updated')
