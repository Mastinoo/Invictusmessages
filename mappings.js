const fs = require('fs');
const MAPPINGS_FILE_PATH = './mappings.json'; // Adjust path as necessary

// Helper function to load mappings from file
function loadMappings() {
  try {
    const data = fs.readFileSync(MAPPINGS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return {}; // Return an empty object if the file doesn't exist yet
  }
}

// Helper function to save mappings to file
function saveMappings(mappings) {
  fs.writeFileSync(MAPPINGS_FILE_PATH, JSON.stringify(mappings, null, 2), 'utf8');
}

// Export functions
module.exports = { loadMappings, saveMappings };
