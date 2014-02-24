// external dependencies
var natural = require('natural')
var inflector = new natural.NounInflector()
var camelCase = require('change-case').camelCase
var _ = require('lodash-node/modern')

// local dependencies
var Taxonomy = require('../../lib/taxonomy')

module.exports = function(site) {

  _.each(site.config.postTypes, function(postType) {
    _.each(site.config.taxonomyTypes, function(taxonomyType) {
      var taxonomyTypePlural = inflector.pluralize(taxonomyType)
      var postTypePlural = inflector.pluralize(postType)
      var helperName = camelCase(['if', postType, 'has', taxonomyType].join('_'))

      // See if a the post context contains the given taxonomy
      //
      // Given the post type `article` and the taxonomy types `tag` and `author`,
      // the following helpers will be generated:
      // - {{ifArticleHasAuthor <value>}}
      // - {{ifArticleHasTag <value>}}
      site.Handlebars.registerHelper(
        camelCase(['if', postType, 'has', taxonomyType].join('_')),
        function(value, options) {
          return this[taxonomyTypePlural] && _.contains(this[taxonomyTypePlural], value)
            ? options.fn(this)
            : options.inverse(this)
        }
      )

      // Get the post count for a given taxonomy
      //
      // Given the post type `article` and the taxonomy types `tag` and `author`,
      // the following helpers will be generated:
      // - {{countArticlesWithAuthor <value>}}
      // - {{countArticlesWithTag <value>}}
      site.Handlebars.registerHelper(
        camelCase(['count', postTypePlural, 'with', taxonomyType].join('_')),
        function(value, options) {

          return Taxonomy.all()[taxonomyType][value].posts.length
        }
      )

      // Iterate over each taxonomy of a given type
      //
      // Given the taxonomy types `tag` and `author`,
      // the following helpers will be generated:
      // - {{#eachAuthor}}
      // - {{#eachTag}}
      site.Handlebars.registerHelper(
        camelCase(['each', taxonomyType].join('_')),
        function(options) {
          var taxonomyValues = Taxonomy.all()[taxonomyType]
          return _.map(_.keys(taxonomyValues).sort(), function(value) {
            return options.fn(taxonomyValues[value])
          }).join('')
        }
      )
    })
  })

}
