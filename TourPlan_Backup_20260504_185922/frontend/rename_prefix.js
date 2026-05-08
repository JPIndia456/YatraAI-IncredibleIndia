const fs = require('fs');

const filesToUpdate = [
  'fix_db.js',
  'fix_missing_tables.js',
  'supabase_security_patch.mjs',
  'supabase_setup.mjs',
  'supabase_update_features.mjs',
  'supabase_rename_sydney.mjs'
];

for (const file of filesToUpdate) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // For rename script, we specifically want to fix the drop trigger line that crashed
    if (file === 'supabase_rename_sydney.mjs') {
      content = content.replace('DROP TRIGGER IF EXISTS set_bookings_updated_at ON yatra_bookings;', '-- DROP TRIGGER IF EXISTS set_bookings_updated_at ON yatra_bookings;');
    } else {
      content = content.replace(/yatra_/g, 'tourplan_');
      content = content.replace(/Yatra/g, 'TourPlan');
    }
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
