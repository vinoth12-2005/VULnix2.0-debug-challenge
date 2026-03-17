const pool = require('./src/config/database');

async function check() {
  try {
    const [dbs] = await pool.execute('SHOW DATABASES');
    console.log('Databases:', dbs.map(d => Object.values(d)[0]));
    
    // Check tables in current DB
    const [tables] = await pool.execute('SHOW TABLES');
    console.log('Tables in current DB:', tables.map(t => Object.values(t)[0]));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
