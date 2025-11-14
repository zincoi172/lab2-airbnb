const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB } = process.env;
  if (!MYSQL_DB) throw new Error("Missing MYSQL_DB in .env");

  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT || 3306),
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    multipleStatements: true,
  });

  // create DB if needed and USE it
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DB}\`; USE \`${MYSQL_DB}\`;`);

  const schemaPath = path.join(__dirname, "../../database/schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  await conn.query(sql);
  console.log("✅ Database initialized / migrated");
  await conn.end();
})().catch((err) => {
  console.error("❌ DB init failed:", err.message);
  process.exit(1);
});
 