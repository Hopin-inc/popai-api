import path from 'path';
import morgan from 'morgan';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import express, { Application } from 'express';
import Router from './routes';

import { AppDataSource } from './config/data-source';
import moment from 'moment';

const myEnv = dotenv.config({ path: path.join(__dirname, '.env') });
dotenvExpand.expand(myEnv);

const PORT = process.env.PORT || 8080;

const app: Application = express();

app.use(express.json());
app.use(morgan('tiny'));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(cors());

app.get('/_ah/warmup', (req, res) => {
  const currentDate = new Date();
  console.log('current datetime (local) : ' + moment(currentDate).format('YYYY/MM/DD HH:mm:ss'));
});

app.listen(PORT, () => {
  console.log('Server is running on port', PORT);
  console.log('Enviroment', process.env.ENV);
});

// establish database connection
AppDataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!');
    app.use('/api', Router);
  })
  .catch((err) => {
    console.error('Error during Data Source initialization:', err);
  });
