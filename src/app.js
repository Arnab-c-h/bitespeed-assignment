const express = require('express');
const AppError = require('./utils/appError.js');
const globalErrorHandler = require('./controllers/errorController.js');
const contactRoutes = require('./routes/contactRoutes.js');

const app = express();


app.use(express.json());


app.use('/identify', contactRoutes);

app.all('/{*any}', (req, res, next) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
