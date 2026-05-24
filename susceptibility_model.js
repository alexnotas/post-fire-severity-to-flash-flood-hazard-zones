// ==============================================================================
// POST-FIRE FLASH FLOOD HOTSPOT MODEL (Multi-Band Export Version)
// Case Study: Patras / Mt. Panachaiko Wildfire 
// Objective: Identify cascading hazard zones & export stacked multi-band data
// ==============================================================================

// 1. DEFINE STUDY AREA (Patras Fire Bounding Box)
var roi = ee.Geometry.Rectangle([21.7400, 38.1900, 21.8700, 38.3100]);
Map.centerObject(roi, 13);
Map.addLayer(roi, {color: 'white'}, 'Study Area Boundary', false);

// 2. WILDFIRE MODULE: Calculate dNBR
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(roi)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5)); 

var preFire = s2.filterDate('2025-07-01', '2025-07-31').median().clip(roi);
var postFire = s2.filterDate('2025-09-01', '2025-09-30').median().clip(roi);

// Calculate NBR
var nbrPre = preFire.normalizedDifference(['B8', 'B12']);
var nbrPost = postFire.normalizedDifference(['B8', 'B12']);
var dNBR = nbrPre.subtract(nbrPost).rename('dNBR');

// Apply Water Mask to make sure we don't take false elements for burn severity
var water = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('max_extent');
var landMask = water.eq(0); 
var dNBR_clean = dNBR.updateMask(landMask); 

// Isolate High Severity Burns (Chosen USGS Threshold: >= 0.44)
var highSeverity = dNBR_clean.gte(0.44);

// 3. Calculate Steep Slopes
var demCollection = ee.ImageCollection('COPERNICUS/DEM/GLO30');
var demProj = demCollection.first().projection();
var dem = demCollection.select('DEM').mosaic().setDefaultProjection(demProj).clip(roi);

var slope = ee.Terrain.slope(dem).rename('Slope');
var steepSlopes = slope.gte(15); 

// 4. Intersect multi-hazards
var floodHotspots = highSeverity.and(steepSlopes).rename('Hotspots');

// 5. visualize
var burnVis = {min: 0.1, max: 0.6, palette: ['green', 'yellow', 'orange', 'red', 'purple']};
Map.addLayer(dNBR_clean, burnVis, '1. dNBR Burn Severity Map', false);
Map.addLayer(highSeverity.updateMask(highSeverity), {palette: ['darkred']}, '2. High Severity Zones', true);
Map.addLayer(floodHotspots.updateMask(floodHotspots), {palette: ['cyan']}, '🚨 3. Critical Flood Hotspots', true);

// 6. Extract data
var areaImage = floodHotspots.multiply(ee.Image.pixelArea());
var totalAreaSqMeters = areaImage.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: roi,
  scale: 30, 
  maxPixels: 1e9
});

// Extract in Hectares and Square Kilometers
var areaHectares = ee.Number(totalAreaSqMeters.get('Hotspots')).divide(10000);
var areaKm2 = areaHectares.divide(100);

print('🚨 DRM METRICS REPORT 🚨');
print('Location:', 'Patras / Mt. Panachaiko');
print('Critical Flood Source Area (Hectares):', areaHectares);
print('Critical Flood Source Area (Square Kilometers):', areaKm2);

// 7. Export data in multi band to use in GIS
var exportImage = ee.Image([
  floodHotspots.rename('Critical_Hotspots'), // Band 1: The binary danger mask
  dNBR_clean.rename('dNBR_Value'),           // Band 2: The raw burn severity numbers
  slope.rename('Slope_Degrees')              // Band 3: The raw terrain steepness
]).toFloat();

Export.image.toDrive({
  image: exportImage,
  description: 'Patras_MultiBand_Hazard_2025',
  folder: 'GEE_DRM_Project',
  scale: 30,
  region: roi,
  fileFormat: 'GeoTIFF',
  maxPixels: 1e13
});
