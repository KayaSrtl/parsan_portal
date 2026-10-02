const app = require('./src/app');
const config = require('./src/config');
const { ready } = require('./src/db');

async function start() {
  await ready; // şema + migrasyonlar hazır olmadan istek kabul etme
  app.listen(config.PORT, () => {
    console.log(`Sunucu http://localhost:${config.PORT} üzerinde çalışıyor`);
  });
}

start().catch((err) => {
  console.error('Sunucu başlatılamadı:', err);
  process.exit(1);
});
