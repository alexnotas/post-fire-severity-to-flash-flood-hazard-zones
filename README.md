# 🚨 Post-Fire Flash Flood Susceptibility Mapping
**Case Study:** Patras / Mt. Panachaiko Wildfire

## 📌 Project Overview
Following severe wildfires, the destruction of vegetation and alteration of soil composition drastically increase the risk of flash floods and debris flows. This project is a **Spatial Susceptibility Tool** built in Google Earth Engine (GEE). It automates the identification of critical runoff origin points by intersecting high-severity burn scars with steep topography.

## 🛠️ Methodology & Tech Stack
* **Platform:** Google Earth Engine
* **Burn Severity:** Sentinel-2 Surface Reflectance (10m)
  * Calculated the Delta Normalized Burn Ratio (dNBR).
  * Applied the JRC Global Surface Water mask to avoid mixing water with burn severity.
  * Isolated critical burn zones using the USGS threshold for Moderate-High severity (`dNBR >= 0.44`).
* **Terrain Module:** Copernicus GLO-30 Digital Elevation Model (30m)
  * Derived localized slope gradients.
  * Isolated steep terrain (`Slope >= 15°`) to mark areas prone to rapid runoff acceleration.
* **Logic:** Executed a Boolean intersection to flag critical pixels meeting both criteria.

## 📊 Outputs
The script calculates the total critical source area in Hectares and queues a **Multi-Band GeoTIFF** for export to Google Drive for downstream analysis in QGIS/ArcGIS.
* `Band 1 (Critical_Hotspots):` Binary Danger Mask
* `Band 2 (dNBR_Value):` Continuous spectral burn severity values
* `Band 3 (Slope_Degrees):` Continuous terrain steepness
