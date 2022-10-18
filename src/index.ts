import path from 'path';
import morgan from 'morgan';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import express, { Application } from 'express';
import Router from './routes';

import { AppDataSource } from './config/data-source';

var myEnv = dotenv.config({ path: path.join(__dirname, '.env') });
dotenvExpand.expand(myEnv);

const PORT = process.env.PORT || 8000;

const app: Application = express();

app.use(express.json());
app.use(morgan('tiny'));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(cors());

app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: '/swagger.json',
    },
  })
);

app.listen(PORT, () => {
  console.log('Server is running on port', PORT);
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
