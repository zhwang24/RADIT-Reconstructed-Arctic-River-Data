// River information
var river = 'Anabar';
var station = 'Saskylakh';
var grdc_no = 2999150;

// Location of the staion
var point = ee.Geometry.Point([114.08, 71.97]);

// Time range
var startDate = '1950-01-01';
var endDate = '2024-01-01';

// Retrieve the drainage basin boundary using grdc_no from cloud files
var arcticRivers = ee.FeatureCollection('users/zihanwang2020/Arctic_Rivers');
var basin = arcticRivers.filter(ee.Filter.eq('grdc_no', grdc_no)).geometry().simplify(1000);
print("River Drainage Basin: ", basin);

var basinStyle = {color: 'blue', width: 2};
Map.addLayer(basin, basinStyle, 'Basin');

// Add the point to the map
Map.addLayer(point, {color: 'FF0000'}, 'Point1');
Map.centerObject(point, 6);

// Define ERA5-Land related variables
var var_list = ['temperature_2m', 'dewpoint_temperature_2m', 'soil_temperature_level_1', 
                'snow_depth_water_equivalent', 'snowfall_sum', 'snowmelt_sum', 
                'total_evaporation_sum', 'total_precipitation_sum', 
                'sub_surface_runoff_sum', 'surface_runoff_sum', 
                'u_component_of_wind_10m', 'v_component_of_wind_10m', 
                'surface_net_solar_radiation_sum', 'surface_net_thermal_radiation_sum'];

// Select the ERA5-Land dataset and required variables
var dataset = ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR")
                .filterDate(startDate, endDate)
                .select(var_list);

// Function to add a prefix to properties
var renameProperties = function(feature, prefix, propertiesList) {
  var newProperties = {};
  
  propertiesList.forEach(function(name) {
    var newName = prefix + name;  // Create new property name using the prefix
    newProperties[newName] = feature.get(name);  // Assign value to the new property
  });
  
  return ee.Feature(null, newProperties).copyProperties(feature, ['date']);
};

// Retrieve ERA5-Land data for the station
var getERA5_Station = function(point, prefix) {
  var timeseries = dataset.map(function(image) {
    var date = image.date().format('YYYY-MM-dd');
    var data = image.reduceRegion({
      reducer: ee.Reducer.first(),
      geometry: point, 
      scale: 1000, 
    });
    return ee.Feature(null, data).set('date', date);
  });

  timeseries = timeseries.map(function(feature) {
    return renameProperties(feature, prefix, var_list);  // Add prefix to ERA5-Land data for the station
  });
  return ee.FeatureCollection(timeseries);
};

// Retrieve ERA5-Land data for the drainage basin
var getERA5_Basin = function(basin, prefix) {
  return dataset.map(function(image) {
    var date = image.date().format('YYYY-MM-dd');
    var data = image.reduceRegion({
      reducer: ee.Reducer.sum(), 
      geometry: basin, 
      scale: 9000,
      bestEffort: true, 
      maxPixels: 1e13, 
    });
    return ee.Feature(null, data).set('date', date);
  }).map(function(feature) {
    return renameProperties(feature, prefix, var_list);  // Add prefix to ERA5-Land data for the drainage basin
  });
};

// Retrieve ERA5-Land data for the staion
var stationERA5 = getERA5_Station(point, 'p1_');

// Retrieve ERA5-Land data for the drainage basin
var basinERA5 = getERA5_Basin(basin, 'basin_');

// Export files to the GEE folder for the corresponding river subfolder
var folderPath = 'GEE';

// Export ERA5-Land data for the station
Export.table.toDrive({
  collection: stationERA5, 
  description: river + '__' + station +  '__Station_ERA5_Land',
  fileFormat: 'CSV',
  folder: folderPath
});

// Export ERA5-Land data for the drainage basin
Export.table.toDrive({
  collection: basinERA5, 
  description: river + '__' + station +  '__Basin_ERA5_Land', 
  fileFormat: 'CSV',
  folder: folderPath
});
