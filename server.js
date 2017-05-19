const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const config = require('dotenv').config().parsed;

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('port', process.env.PORT || 3000);
app.locals.title = 'BYOB';

app.get('/', (request, response) => {
  response.send('It\'s a BYOB kind of project.');
});

const environment = process.env.NODE_ENV || 'development';
const configuration = require('./knexfile')[environment];
const database = require('knex')(configuration);

if (!config.CLIENT_SECRET || !config.USERNAME || !config.PASSWORD) {
  throw 'Make sure you have a CLIENT_SECRET, USERNAME, and PASSWORD in your .env file';
}

app.set('secretKey', config.CLIENT_SECRET);

const checkAuth = (request, response, next) => {
  const token = request.body.token ||
                request.params('token') ||
                request.headers['authorization'];

  if (token) {
    jwt.verify(token, app.get('secretKey'), (error, decoded) => {
      if (error) {
        return response.status(403).send({
          success: false,
          message: 'Invalid authorization token.'
        });
      } else {
        request.decoded = decoded;
        next();
      }
    });
  } else {
    return response.status(403).send({
      success: false,
      message: 'You must be authorized to hit this endpoint'
    });
  }
};


// GET routes for merchants and products
app.get('/api/v1/merchants', (request, response) => {
  database('merchants').select()
    .then(merchants => {
      response.status(200).json(merchants);
    })
    .catch(error => {
      response.status(404).send({
        error: 'There are no merchants in the database'
      });
    });
});

app.get('/api/v1/merchants/:merchant_id', (request, response) => {
  database('merchants').where('merchant_id', request.params.merchant_id).select()
    .then(folders => {
      response.status(200).json(folders);
    })
    .catch(error => {
      response.status(404).send({
        error: 'That merchant does not exist in the database'
      });
    });
});

app.get('/api/v1/products', (request, response) => {
  database('products').select()
    .then(products => {
      response.status(200).json(products);
    })
    .catch(error => {
      response.status(404).send({
        error: 'There are no products in the database'
      });
    });
});

app.get('/api/v1/products/:id', (request, response) => {
  database('products').where('id', request.params.id).select()
    .then(products => {
      response.status(200).json(products);
    })
    .catch(error => {
      response.status(404).send({
        error: 'That product does not exist in the database'
      });
    });
});

// Custom API point for Walgreens
app.get('/api/v1/merchantName', (request, response) => {
  database('merchants').where('merchant_name', request.query.merchant_name).select()
    .then(merchants => {
      response.status(200).json(merchants);
    })
    .catch(error => {
      response.status(404).send({
        error: 'There is no such merchant in the database'
      });
    });
});

// POST routes for adding merchants and products
app.post('/api/v1/merchants', (request, response) => {
  const { merchant_name, merchant_id } = request.body;

  if (!merchant_name || !merchant_id) {
    return response.sendStatus(422);
  }

  database('merchants').insert({ merchant_name, merchant_id }, ['merchant_name', 'merchant_id'])
    .then(() => {
      database('merchants').select()
      .then(merchants => {
        response.status(201).json(merchants);
      });
    });
});

app.post('/api/v1/products', (request, response) => {
  const { product_keyword, merchant } = request.body;

  if (!product_keyword || !merchant) {
    return response.sendStatus(422);
  }

  database('products').insert({ product_keyword, merchant }, ['product_keyword', 'merchant'])
    .then(products => {
      response.status(201).json(products);
    });
});

// DELETE routes for single merchant or single product
app.delete('/api/v1/merchants/:merchant_id', (request, response) => {
  database('merchants').where('merchant_id', request.params.merchant_id).del()
  .then(() => {
    database('merchants').select()
      .then((merchants) => {
        response.status(200).json(merchants);
      })
      .catch(error => {
        response.status(404).send({
          error: 'There is no such merchant in the database'
        });
      });
  });
});

app.delete('/api/v1/products/:id', checkAuth, (request, response) => {
  database('products').where('id', request.params.id).del()
  .then(() => {
    database('products').select()
    .then((products) => {
      response.status(200).json(products);
    });
  });
});

// PUT route for replacing product keyword and merchant on single product
app.put('/api/v1/products/:id/replace', checkAuth, (request, response) => {
  database('products').where('id', request.params.id)
    .update({
      product_keyword: request.body.product_keyword,
      merchant: request.body.merchant
    })
    .then(() => {
      database('products').select()
      .then((products) => {
        response.status(200).json(products);
      });
    });
});

// PATCH route for editing product keyword on single product
app.patch('/api/v1/products/:id/edit', checkAuth, (request, response) => {
  database('products').where('id', request.params.id)
    .update({
      product_keyword: request.body.product_keyword
    })
    .then(() => {
      database('products').select()
      .then((products) => {
        response.status(200).json(products);
      });
    });
});

if (!module.parent) {
  app.listen(app.get('port'), () => {
  });
}

module.exports = app;
