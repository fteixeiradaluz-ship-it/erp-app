const { Client } = require('pg');

async function main() {
  const connectionString = "postgresql://neondb_owner:npg_VBMAP7HwKlO9@ep-withered-recipe-acifu9b1-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected to Neon DB 'neondb' successfully!");
    
    // Check tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log("Tables in neondb:", tablesRes.rows.map(r => r.table_name));
  } catch (err) {
    console.error("Error connecting/querying neondb:", err);
  } finally {
    await client.end();
  }
}

main();
