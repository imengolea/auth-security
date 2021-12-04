require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const crypto = require('crypto');

const nodemailer = require("nodemailer");

//const bcrypt = require('bcrypt');
//const saltRounds = 10;
//level2
//const encrypt = require('mongoose-encryption');
//level3
//const md5 = require('md5');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));


app.use(session({
  secret: 'my auth template',
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB', {
  useNewUrlParser: true
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    // required: true
  },
  email: {
    type: String,
    unique: true,
    // required: true
  },
  category: {
    type: String,
    // required: true
  },
  password: {
    type: String,
    // required: true
  },
  googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//level2
//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

// //create the session
// passport.serializeUser(User.serializeUser());
// //reveal what in the session
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/auth"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.get('/', function(req, res) {
  res.render('home');
});

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile']
  })
);

app.get('/auth/google/auth',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect to secrets .
    res.redirect('/dashboard');
  });

app.get('/login', function(req, res) {
  res.render('login')
});

app.get('/dashboard', function(req, res) {
  if (req.isAuthenticated()) {
    res.render('dashboard', {
      name: req.user.name,
      category: req.user.category
    })
  } else {
    res.redirect('/login')
  }

})

app.get('/register', function(req, res) {
  res.render('register')
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.post('/register', function(req, res) {

  User.register({
    username: req.body.username,
    name: req.body.name,
    category: req.body.category
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect('/register');
    } else {
      passport.authenticate('local')(req, res, function() {
        //verified email
        const token = crypto.randomBytes(32).toString('hex');
        const url = 'http://localhost:3000?token=' + token;
        console.log(url);
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'goleaiman@gmail.com',
            password: 'imancanadabatna2017'
          }
        })
        // transporter.sendMail({
        //   from: 'email', // sender address
        //   to: username, // list of receivers
        //   subject: "verify your account", // Subject line
        //   text: "Click this link to verify : ${url}", // plain text body
        //    html: "<h3>Click this link to verify : ${url}</h3>", // html body
        // })


        res.redirect('/dashboard')
      });
    }

  });


});

app.post('/login', function(req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  })
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate('local')(req, res, function() {
        res.redirect('/dashboard')
      });
    }
  })



})







app.listen(3000, function() {
  console.log('server runs on port 3000');
})
