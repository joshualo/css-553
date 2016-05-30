'use strict';
/**
 * sdlc.js
 * tool to manage Software Development Live Cycle tool
 */

var mongoose = require('mongoose'),
  _ = require('lodash');

var Priority = {
  NONE: 0,
  NOW: 1,
  MUST: 2,
  NEED: 3,
  WANT: 4,
  LIKE: 5,
}

var schema = new mongoose.Schema({
  lanes: [{
    title: {type: String, required: true},
    items: [{
      title: {type: String},
      details: {type: String},
      priority: {type: Number, enum: _.values(Priority)},
    }]
  }]
});

module.exports = mongoose.model('AgileBoard', schema);
