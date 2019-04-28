/* eslint-disable object-shorthand */
/* eslint-disable global-require */
const express = require('express')
const path = require('path')
const session = require('express-session')
const expressValidator = require('express-validator')
const flash = require('connect-flash')
const http = require('http')
// const io = require('socket.io')(http)
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const passport = require('passport')
const config = require('./config/database')

// Init App
const app = express()

const port = process.env.PORT || 3000

const server = app.listen(port, function() {
	console.log('Server started on port 3000')
})

// Socket.io stuff
const socketServer = http.createServer(app)

// eslint-disable-next-line import/order
const io = require('socket.io')(socketServer)

// Database stuff
mongoose.connect(config.database, { useNewUrlParser: true })
const db = mongoose.connection

db.once('open', function() {
	console.log('Connected to MongoDB')
})

// Check for DB errors
db.on('error', function(err) {
	console.log(err)
})

// Load view engine
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(bodyParser.urlencoded({ extended: false }))

// Set static folder
app.use(express.static('public'))

// Express Session Middleware
app.use(
	session({
		secret: 'potatis',
		resave: true,
		saveUninitialized: true,
	})
)
// Express Messages Middleware
app.use(require('connect-flash')())

app.use(function(req, res, next) {
	res.locals.messages = require('express-messages')(req, res)
	next()
})

// Express Validator Middleware
app.use(
	expressValidator({
		errorFormatter(param, msg, value) {
			const namespace = param.split('.')
			const root = namespace.shift()
			let formParam = root

			while (namespace.length) {
				formParam += `[${namespace.shift()}]`
			}
			return {
				param: formParam,
				msg,
				value,
			}
		},
	})
)

require('./config/passport')(passport)
// Passport Middleware
app.use(passport.initialize())
app.use(passport.session())

app.get('*', function(req, res, next) {
	res.locals.user = req.user || null
	next()
})

// Route Files
const routes = require('./routes/index')

app.use('/', routes)

// Socket.io stuff
io.listen(server)

io.on('connection', function(socket) {
	console.log('A user connected')

	socket.on('greet', function(data) {
		console.log(data)
		socket.emit('respond', { hello: 'Hey, Mr.Client!' })
	})
})

