var path = require('path');
var DATABASE_URL = process.env.DATABASE_URL || {database: 'd3_demo'}

var knex = require('knex') ({
  client: 'postgresql',
  connection: DATABASE_URL
});

var db = require('bookshelf')(knex);

db.knex.schema.hasTable('city_state').then(function(exists) {
  if (!exists) {
    db.knex.schema.createTable('city_state', function (city_state) {
      city_state.string('id').primary();
      city_state.string('city', 255).unique();
      city_state.string('state', 255);
      city_state.integer('count');
      city_state.decimal('long');
      city_state.decimal('lat');
    }).then(function (table) {
      console.log('Created Table', table);
    });
  }
});



module.exports = db;
