/* eslint-disable no-useless-return */
const express = require('express')
const bcrypt = require('bcryptjs')
const passport = require('passport')
const fs = require('fs')

const router = express()

const User = require('../models/user')

// Home route
router.get('/', function(req, res) {
	console.log('Im routing now')
	res.render('index', { title: 'Surveillance is key' })
})

// Login Form
router.post('/', function(req, res, next) {
	passport.authenticate('local', {
		successRedirect: '/surveillance',
		failureRedirect: '/',
		failureFlash: true,
	})(req, res, next)
})

router.get('/register', function(req, res) {
	res.render('register', { titel: 'Register here' })
})

router.post('/register', function(req, res) {
	const { username } = req.body
	const { password } = req.body
	const { password2 } = req.body
	const { adminCheck } = req.body
	console.log(adminCheck)

	req.checkBody('username', 'Name is required').notEmpty()
	req.checkBody('password', 'Password is required').notEmpty()
	req.checkBody('password2', 'Confirm password is required').notEmpty()
	req.checkBody('password2', 'Passwords do not match').equals(password)

	const errors = req.validationErrors()

	if (errors) {
		res.render('register', {
			errors,
		})
	} else {
		let adminValue = 0
		if (adminCheck) {
			adminValue = 1
		}
		console.log(adminValue)
		const newUser = new User({
			username,
			password,
			admin: adminValue,
		})

		bcrypt.genSalt(10, function(err, salt) {
			bcrypt.hash(newUser.password, salt, function(err, hash) {
				if (err) {
					console.log(err)
				}
				newUser.password = hash

				newUser.save(function(err) {
					if (err) {
						console.log(err)
						return
					}
					req.flash('success', 'You are now registered and can login')
					res.redirect('/')
				})
			})
		})
	}
})

// global variable to keep track of how many times the get request have been made
// to surveillance
let loadTime = 0

router.get('/surveillance', function(req, res) {
	//console.log(res.locals.user)
	loadTime = loadTime + 1
	console.log(loadTime)
	// Deleting everything in the file if next time is bad shutdown
	if(loadTime === 1) {
		res.render('surveillance', {
			user: res.locals.user,
			shutdownMessage: res.locals.shutdownMessage,
		})	
	} else {
		res.render('surveillance', {
			user: res.locals.user,		
			shutdownMessage: '',		
		})
	}
})

router.get('/logout', function(req, res) {
	req.logout()
	req.flash('success', 'You are logged out')
	res.redirect('/')
})

router.use(function(req, res, next) {
  return res.render('404', {url: req.url})
});


module.exports = router
