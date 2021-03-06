/** Require external modules */
const express = require(`express`);
const ezhtml = require(`ezhtml`);
const ezobjects = require(`ezobjects-mysql`);
const htmlspecialchars = require(`htmlspecialchars`);
const parser = require(`body-parser`);
const path = require(`path`);
const session = require(`express-session`);
const store = require(`session-file-store`);
const url = require(`url`);
const winston = require(`winston`);

/** Require local moduels */
const models = require(`./index`);
const views = require(`../views`);

class AutoFormServer {
  /** Create constructor method */
  constructor(db = null) {
    this.init(db);
  }
  
  /** Create initializer method */
  init(db = null) {
    /** Initialize autoforms array */
    this.autoforms([]);

    /** Store db */
    this.db(db);

    /** Create express app */
    const app = express();

    /** Store express app */
    this.app(app);

    /** Use external body parser middleware to parse POST params into request body */
    this.app().use(parser.urlencoded({ extended: true }));

    /** Create session file store */
    const FileStore = store(session);

    /** Use external session middleware to store user session variables */
    this.app().use(session({
      store: new FileStore({ logFn: () => {} }),
      secret: `JAs,fj$@nflkfj23f-h3kFSD<25%%$t54g5!t2fj0DF(*)S*FS`,
      saveUninitialized: false,
      resave: false,
      cookie: {
        maxAge: 1209600000
      }
    }));
    
    /** Create custom Winston logger */
    const logger = new winston.Logger({
      transports: [
        new winston.transports.Console({
          level: `silly`,
          timestamp: true,
          prettyPrint: true
        })
      ]
    });

    /** Use the following middleware to log requests and attach various useful variables to request object */
    this.app().use(async (req, res, next) => {
      req.db = this.db();
      req.escape = htmlspecialchars;
      req.page = new ezhtml.Page();
      req.log = logger.info;

      /** Log the page request */
      req.log(`${req.method} ${url.parse(req.originalUrl).pathname} requested by ${req.ip} (Worker ${process.pid})`);

      /** If there is a user session associated with this request, process it and attach user to request */
      if ( req.session.username && req.session.password ) {
        req.log(`Existing session found for ${req.session.username}, authenticating...`);

        /** Create user model */
        const user = new models.User();

        /** Await user load */
        try {
          if ( await user.load(req.session.username, req.db) == -1 )
            throw new ReferenceError(`AutoFormServer.init(): Username does not exist.`);

          /** Verify session password and attach user to request or issue warning */
          if ( user.password() == req.session.password ) {
            req.user = user;
            req.log(`Session for ${req.session.username} is authenticated, processing request...`);
          } else {
            req.log(`Attempted session login by ${req.session.username} failed!`);
          }
        } catch ( err ) {
          req.log(err);

          /** Delete stored credentials from session */
          delete req.session.username;
          delete req.session.password;
        }
      }

      /** Call request to next express middleware/route */
      next();
    });
  }
  
  app(arg1) {
    /** Getter */
    if ( typeof arg1 === `undefined` )
      return this._app;
    
    /** Setter */
    else if ( typeof arg1 === `function` )
      this._app = arg1;
    
    /** Throw type error */
    else
      throw new TypeError(`AutoFormServer.app(): Non-function value passed to 'function' setter.`);
    
    /** Return this for call chaining */
    return this;
  }
  
  db(arg1) {
    /** Getter */
    if ( typeof arg1 === `undefined` )
      return this._db;
    
    /** Setter */
    else if ( arg1 === null || ( typeof arg1 === `object` && arg1.constructor.name === `MySQLConnection` ) )
      this._db = arg1;
    
    /** Throw type error */
    else
      throw new TypeError(`AutoFormServer.db(): Invalid value passed to 'MySQLConnection' setter.`);
    
    /** Return this for call chaining */
    return this;
  }
  
  autoforms(arg1) {
    /** Getter */
    if ( typeof arg1 === `undefined` )
      return this._autoforms;
    
    /** Setter */
    else if ( arg1 === null || ( typeof arg1 === `object` && arg1.constructor.name === `Array` ) )
      this._autoforms = arg1;
    
    /** Throw type error */
    else
      throw new TypeError(`AutoFormServer.autoforms(): Non-Array value passed to 'Array' setter.`);
    
    /** Return this for call chaining */
    return this;
  }
  
  /** Create method for adding auto form configurations */
  addAutoForm(config) {
    /** Create array to store auto form property objects */
    const properties = [];

    /** Loop through each property in the auto form configuration... */
    config.properties.forEach((propertyConfig) => {
      /** Create new auto form property instance */
      const property = new models.AutoFormProperty(propertyConfig);

      /** Add property to array */
      properties.push(property);
    });

    /** Overwrite properties in config with array of auto form properties */
    config.properties = properties;

    /** Create auto form */
    const autoform = new models.AutoForm(config);

    /** Validate auto form */
    autoform.validate();
    
    /** If record can be archived, add column to track that */
    if ( autoform.canArchive() )
      autoform.properties().push(new models.AutoFormProperty({ name: `active`, type: `boolean`, inputCols: 16, inputLabel: `Active:`, alignment: `horizontal` }));

    /** Generate record class */
    autoform.generateClass(autoform);

    /** Add auto form to array */
    this.autoforms().push(autoform);

    /** Create router for this auto form */
    const router = express.Router();

    /** Create route for autoforms CSS */
    router.get(`/css/` + path.basename(autoform.cssPath()), (req, res) => {
      res.sendFile(autoform.cssPath());
    });
    
    /** Create route for autoforms CSS map */
    router.get(`/css/` + path.basename(autoform.cssPath().replace(`.css`, `.css.map`)), (req, res) => {
      res.sendFile(autoform.cssPath().replace(`.css`, `.css.map`));
    });
    
    /** Create route for edit icon */
    router.get(`/images/` + path.basename(autoform.editIconPath()), (req, res) => {
      res.sendFile(autoform.editIconPath());
    });
    
    /** Create route for archive icon */
    router.get(`/images/` + path.basename(autoform.archiveIconPath()), (req, res) => {
      res.sendFile(autoform.archiveIconPath());
    });
    
    /** Create route for delete icon */
    router.get(`/images/` + path.basename(autoform.deleteIconPath()), (req, res) => {
      res.sendFile(autoform.deleteIconPath());
    });
    
    /** Create route to logout */
    router.all(`/logout`, (req, res) => {
      /** Delete stored credentials from session */
      delete req.session.username;
      delete req.session.password;

      res.redirect(`login`);
    });
    
    /** Output header */
    router.use(autoform.headerTemplate());

    /** Create 'before' routes to list, add, edit, archive, login, and create templates */
    router.all(`/list`, autoform.listTemplateBefore());
    router.all(`/add`, autoform.addTemplateBefore());
    router.all(`/edit`, autoform.editTemplateBefore());
    router.all(`/login`, autoform.loginTemplateBefore());
    router.all(`/create`, autoform.createTemplateBefore());

    /** Create routes to list, add, edit, and archive records */
    router.all(`/list`, views.list(autoform));
    router.all(`/add`, views.add(autoform));
    router.all(`/edit`, views.edit(autoform));
    router.all(`/archive`, views.archive(autoform));
    router.all(`/delete`, views.delete(autoform));

    /** Create route to login and create account */
    router.all(`/login`, views.login(autoform));
    router.all(`/create`, views.create(autoform));

    /** Create 'after' routes to list, add, edit, archive, login, and create templates */
    router.all(`/list`, autoform.listTemplateAfter());
    router.all(`/add`, autoform.addTemplateAfter());
    router.all(`/edit`, autoform.editTemplateAfter());
    router.all(`/login`, autoform.loginTemplateAfter());
    router.all(`/create`, autoform.createTemplateAfter());

    /** Output header */
    router.use(autoform.footerTemplate());
    
    /** Render output and send to user */
    router.use((req, res) => res.send(req.page.render()));
    
    /** Call request to next express middleware/route */
    this.app().use(config.path, router);
  }

  /** Create method for creating tables */
  async createTables() {
    /** Loop through each auto form... */
    for ( let i = 0, iMax = this.autoforms().length; i < iMax; i++ ) {
      /** Create user table if it doesn't already exist */
      await ezobjects.createTable(this.autoforms()[i].configRecord(), this.db());
    }

    /** Create user table if it doesn't already exist */
    await ezobjects.createTable(models.configUser, this.db());
  }

  /** Create method for starting express web server */
  async listen(port) {
    await new Promise((resolve) => {
      this.app().listen(port, () => resolve());
    });
  }
}

/** Export AutoFormServer class */
module.exports.AutoFormServer = AutoFormServer;
