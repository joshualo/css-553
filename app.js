'use strict';
/**
 * app.js 
 * starts the express server and manages routes
 */

var express = require('express'),
  http = require('http'),
  socketIO = require('socket.io'),
  bodyParser = require('body-parser'),
  jade = require('jade'),
  mongoose = require('mongoose'),
  Redis = require('ioredis'),
  log = require('winston'),
  Project = require('./src/models/project'),
  SDLC = require('./src/models/sdlc');

//----------
// Initialize the logger
//----------
log.handleExceptions = true;
log.exitOnError = false;

//----------
// Initialize the default connection for Mongoose
//----------
var mongoLocation = process.env.NODE_ENV === 'production' ? 
  'mongodb://css553-server:css553@ds011883.mlab.com:11883/css-553' : 'mongodb://localhost/css-553';

mongoose.connect(mongoLocation, err => {
  if (err) {
    log.error('mongoose database failed to connect', {err});
    return;
  }

  log.info('mongoose database connected', {mongoLocation});
});

var DOCUMENT_EXISTS_ERR = 11000;
var UNIQUE_KEY_EXISTS_ERR = 11001;

//----------
// Initialize the default publisher connection for Redis
//----------
var pub = new Redis('redis://:css553@pub-redis-14314.us-east-1-4.4.ec2.garantiadata.com:14314');

//----------
// Setup up the express application and connect routes.
//----------
var app = express()
  .set('views', process.cwd() + '/src/views')
  .set('view engine', 'jade')
  .set('query parser', 'extended')
  .set('trust proxy', true)
  .use(bodyParser.urlencoded({extended: true}))
  .use(express.static(__dirname + '/public'))
  ;

if (process.env.NODE_ENV !== 'production') {
  var morgan = require('morgan');
  app.use(morgan('dev'));
}

// global constants
app.locals.constants = {
  SDLCStep: SDLC.Step
}

// routes
app
  .get('/', (req, res, next) => {
    Project.find({}, (err, projects) => {
      res.locals.projects = projects;
      res.render('home.jade');
    });
  })

  // get a project
  .get('/projects/:id', (req, res, next) => {
    Project.findById(req.params.id, (err, project) => {
      res.locals.project = project;
      res.render('project.jade');
    });
  })

  // create a new project
  .post('/projects', (req, res, next) => {
    var projectInfo = req.body;
    var project = new Project(projectInfo);

    project.save(err => {
      if (err) {
        log.error('save error', {route: '/project', method: 'POST', info: projectInfo, err});

        if (err.code === DOCUMENT_EXISTS_ERR || err.code === UNIQUE_KEY_EXISTS_ERR) {
          res.locals.err = 'A project with this name exists, project names must be unique'
          res.render('home.jade')
          return;
        }
        res.locals.err = 'There was a problem creating your project. Please try again later.'
        res.render('home.jade')
        return;
      }

      res.redirect('/projects/${project._id}');
    })
  })

  // get sdlc for project
  .get('/sdlc/:id', (req, res, next) => {
    SDLC.findById(req.params.id, (err, sdlc) => {
      if (err) {
        log.error('find error', {route: '/sdlc', method: 'GET', err});

        res.locals.err = 'There was a problem retrieving the sdlc tool for your project. Please try again later.'
        res.redirect('/projects/${req.params.id}');
        return;
      }

      if (!sdlc) {
        var sdlc = new SDLC();
        sdlc.save(err => {
          if (err) {
            log.error('save error', {route: '/sdlc', method: 'GET', err});

            res.locals.err = 'There was a problem retrieving the sdlc tool for your project. Please try again later.'
            res.redirect('/projects/${req.params.id}');
            return;
          }
        })
      }

      res.locals.sdlc = sdlc;
      res.render('sdlc.jade');
    });
  })

  // update sdlc for a project
  .post('/sdlc/:id', (req, res, next) => {
    var sdlcInfo = req.body;

    SDLC.findByIdAndUpdate(req.params.id, {$set: sdlcInfo}, {new: true}, function (err, sdlc) {
      if (err) {
        log.error('findByIdAndUpdate error', {route: '/sdlc', method: 'POST', id: req.params.id, err});

        res.locals.err = 'There was a problem updating the sdlc tool for your project. Please try again later.'
        res.redirect('/sdlc/${req.params.id}');
        return;
      }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(sdlc));
    });
  });

//----------
// Setup an HTTP server, attach our express application
// Setup an io server, attatch our http server, setup socket handlers
// Begin listening.
//----------
var httpServer = http.createServer(app);
var io = socketIO(httpServer)

// socket handlers
io.on('connection', socket => {
  socket.on('subscribe', data => {
    log.log(data);
    var sub = new Redis();
    sub.on(data.projectID, (channel, message) => {
      log.log('Receive message %s from channel %s', message, channel);
      socket.emit('data', message);
    });
  });
});

// start it up
httpServer.listen(8080, () => {
  var host = httpServer.address().address;
  var port = httpServer.address().port;
  log.info('Web server started', {host, port});

  if (process.env.NODE_ENV !== 'production') {
    log.warn('!!! development mode enabled !!!');
  }
});
