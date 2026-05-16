require('dotenv').config();
const { sequelize } = require('./index');
async function migrate() {
  await sequelize.query("ALTER TABLE Users ADD COLUMN emailVerified INTEGER DEFAULT 0").catch(() => {});
  await sequelize.query("ALTER TABLE Users ADD COLUMN verificationToken TEXT").catch(() => {});
  await sequelize.query("ALTER TABLE Stores ADD COLUMN email TEXT").catch(() => {});
  console.log('Migration done');
  process.exit(0);
}
migrate();
