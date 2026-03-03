const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const app = require('./app');

const prisma = new PrismaClient();

const port = process.env.PORT || 3000;

app.listen(port, () => {
	console.log(`App running on port ${port}...`);
});
