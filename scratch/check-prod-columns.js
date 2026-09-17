const { Client } = require('pg');

async function main() {
  const connectionString = "postgresql://neondb_owner:npg_VBMAP7HwKlO9@ep-withered-recipe-acifu9b1-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected to Neon DB successfully!");
    
    // Check columns of Lead table
    const columnsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Lead';
    `);
    console.log("Columns in Lead table:", columnsRes.rows);
  } catch (err) {
    console.error("Error querying columns:", err);
  } finally {
    await client.end();
  }
}

main();
