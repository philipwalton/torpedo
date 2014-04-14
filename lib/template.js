var fs = require('fs-extra');
var path = require('path');
var os = require('os');
var Handlebars = require('handlebars');
var _ = require('lodash-node/modern');

var Permalink = require('./permalink');

// TODO: add caching and cache invalidation so files aren't read
// twice unless we're previewing locally and the file actually changed


// Store the templates that were created from files.
var templateFiles = {};


function Template(data, content, config) {

  // Argument shifting.
  // If data is a string then it's a path to a file.
  if (typeof data == 'string') {
    var parsed = parseTemplateFile(data);
    this.filename = data
    this.content = parsed.content;
    this.data = parsed.data;
    this.config = content;
  } else {
    this.data = data
    this.content = content
    this.config = config;
  }

  // Recursively merge this file's data all the way up the layout chain.
  this._storeLayout();
  this._mergeDataWithLayout();

  // Add this file to the store
  if (this.filename) templateFiles[this.filename] = this;
}

/**
 * Useful for things like pagination.
 */
Template.prototype.clone = function() {
  return new Template(_.cloneDeep(this.data), this.content, this.config);
}

Template.prototype.resolvePermalink = function(overrides) {

  var structure = this.data.permalink || this.config.permalink
  overrides || (overrides = {})

  return new Permalink(structure, {
    type: overrides.type, // type usually comes from the post
    filename: overrides.filename || this.filename,
    pagenum: overrides.pagenum || this.data.pagenum,
    title: overrides.title || this.data.title,
    date: overrides.data || this.date,
    timezone: overrides.timezone || this.config.timezone
  });
}


Template.prototype.renderContent = function(data) {
  return Handlebars.compile(this.content)(data || this.data)
}


Template.prototype.renderLayout = function(content, data) {

  // Argument shifting.
  if (typeof content == 'object') {
    data = content;
    content = null;
  }

  // recursively render the template up the layout chain
  return (function fn(layout, content, data) {
    data.content = content
    content = Handlebars.compile(layout.content)(data)
    layout = layout.layout
    return layout ? fn(layout, content, data) : content
  }(this.layout, content || this.renderContent(), data || this.data))
}


Template.prototype._mergeDataWithLayout = function() {
  if (this.layout && this.layout.data) {
    // for query data we want to merge the values with any layout values
    if (this.data.query && this.layout.data.query) {
      _.merge(this.data.query, this.layout.data.query)
    }
    // all other propertyes can simply use _.defaults
    _.defaults(this.data, this.layout.data)
  }
}

Template.prototype._storeLayout = function() {
  if (this.data && this.data.layout) {
    var layoutFilepath = this.config.layoutsDirectory + '/'
      + this.data.layout + '.html';

    this.layout = Template.getOrCreateFromFile(layoutFilepath, this.config);
  }
};







Template.getOrCreateFromFile = function(filename, config) {
  var template = templateFiles[filename];
  return (template && template.config == config)
    ? template
    : new Template(filename, config);
};


function parseTemplateFile(filename) {

  var file = fs.readFileSync(filename, 'utf8');
  var lines = file.split(os.EOL);
  var line = lines.shift();
  var data = '';

  // return false if no file data is found
  if (line != '<!--') {
    return {
      data: null,
      content: file
    }
  }

  while ((line = lines.shift()) != null) {
    if (line != '-->') {
      data += line;
    } else {
      break;
    }
  }

  return {
    data: JSON.parse(data),
    content: lines.join(os.EOL)
  };
};

module.exports = Template;