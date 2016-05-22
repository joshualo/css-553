'use strict';
/**
 * project.js
 * main project model all tools will reference these projects
 */

var mongoose = require('mongoose'),
  log = require('winston');

var schema = new mongoose.Schema({
  name: {type: String, trim: true, lowercase: true, required: true, unique: true},
  teamName: {type: String, trim: true, required: true},
  description: {type: String, trim: true, required: true},
});

var Project = module.exports = mongoose.model('Project', schema);
