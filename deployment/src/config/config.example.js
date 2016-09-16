
var path = require('path')
  , rootPath = path.normalize(__dirname + '/..')
  , templatePath = path.normalize(__dirname + '/../app/mailer/templates')
  , notifier = {
      service: 'postmark',
      APN: false,
      email: false, // true
      actions: ['comment'],
      tplPath: templatePath,
      key: 'POSTMARK_KEY',
      parseAppId: 'PARSE_APP_ID',
      parseApiKey: 'PARSE_MASTER_KEY'
    }

module.exports = {
  development: {
    db: 'mongodb://localhost/noobjs_dev',
    root: rootPath,
    notifier: notifier,
    app: {
      name: 'Sociotal Site'
    },
    facebook: {
      clientID: "539774772806896",
      clientSecret: "7ae5c38bf110537b0476905c8ac614ef",
      callbackURL: "http://localhost:3000/auth/facebook/callback"
    }
  },
  test: {
    db: 'mongodb://localhost/noobjs_test',
    root: rootPath,
    notifier: notifier,
    app: {
      name: 'Sociotal Site'
    },
    facebook: {
      clientID: "539774772806896",
      clientSecret: "7ae5c38bf110537b0476905c8ac614ef",
      callbackURL: "http://localhost:3000/auth/facebook/callback"
    }
  },
  production: {}
}
