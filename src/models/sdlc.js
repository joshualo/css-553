'use strict';
/**
 * sdlc.js
 * tool to manage Software Development Live Cycle tool
 */

var mongoose = require('mongoose'),
  _ = require('lodash');

var Step = {
  OVERVIEW: 0,
  PLANNING: 1,
  REQUIREMENTS: 2,
  DESIGN: 3,
  IMPLEMENTATION: 4,
  TESTING: 5,
  DEPLOYMENT_AND_MAINTENANCE: 6
}

var schema = new mongoose.Schema({
  status: {type: Number, enum: _.values(Step), required: true, default: Step.OVERVIEW},
});

schema.statics.Step = Step;

module.exports = mongoose.model('SDLC', schema);
