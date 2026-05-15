const fs = require('fs');
const path = require('path');

// Render Root Directory ayarına göre doğru yolu bul
if (fs.existsSync(path.join(__dirname, 'src', 'index.js'))) {
    require('./src/index.js');
} else {
    require('./index.js'); // Eğer zaten src içindeyse
}
