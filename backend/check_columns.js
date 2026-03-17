const pool = require('./src/config/database');

async function checkColumns() {
  try {
    const [columns] = await pool.execute('DESC teams');
    console.log('Columns in teams:', columns.map(c => c.Field));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkColumns();
