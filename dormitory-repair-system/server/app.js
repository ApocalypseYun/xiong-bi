const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Routes (will be added in later tasks)
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/user', require('./routes/user'));
// app.use('/api/orders', require('./routes/orders'));
// app.use('/api/admin', require('./routes/admin'));
// app.use('/api/upload', require('./routes/upload'));
// app.use('/api/evaluations', require('./routes/evaluations'));
// app.use('/api/announcements', require('./routes/announcements'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
