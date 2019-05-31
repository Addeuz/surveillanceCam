/* eslint-disable object-shorthand */
/* eslint-disable global-require */
const express = require('express')
const path = require('path')
const session = require('express-session')
const expressValidator = require('express-validator')
const flash = require('connect-flash')
const http = require('http')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const passport = require('passport')
const { Gpio } = require('onoff')
const fs = require('fs')
const PiCamera = require('pi-camera')

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
const config = require('./config/database')

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

// Check file if there is a shutdown message
const logPath = '/home/pi/Documents/Code/surveillanceCam/log/logfile.txt'
const dataBuffer = fs.readFileSync(logPath)
let dataString = ''
// eslint-disable-next-line no-unused-expressions
dataBuffer.toString() === '' ? (dataString = null) : (dataString = dataBuffer.toString())

// Deleting everything in the file if next time is bad shutdown
fs.writeFile(logPath, '', function() {
	console.log('done')
})

app.get('*', function(req, res, next) {
	res.locals.user = req.user || null
	res.locals.shutdownMessage = dataString
	next()
})

// Route Files
const routes = require('./routes/index')

app.use('/', routes)

// <----------------- Raspberry Pi stuff ----------------->

const LED = new Gpio(4, 'out')
const pir = new Gpio(12, 'in', 'both')

let intruderNr = 0

// ${__dirname}/intruder/test.jpg

function blinkLED() {
	if (LED.readSync() === 0) {
		LED.writeSync(1)
		console.log('UIoooUIoooUIooo')
	} else {
		LED.writeSync(0)
	}
}

// Socket.io stuff
io.listen(server)

io.on('connection', function(socket) {
	console.log('A user connected')
	let lightvalue = 0

	socket.on('light', function(data) {
		lightvalue = data
		if (lightvalue !== LED.readSync()) {
			LED.writeSync(lightvalue)
		}
	})

	pir.watch(function(err, value) {
		if (err) {
			console.log('There was an error', err)
			return
		}
		console.log('Intruder detected', value)
		if (value === 1) {
			const intruderDate = new Date()
				.toISOString()
				.replace(/T/, '_')
				.replace(/\..+/, '')
			const myCamera = new PiCamera({
				mode: 'photo',
				output: `${__dirname}/intruder/intruder${intruderNr}_${intruderDate}.jpg`,
				width: 500,
				height: 500,
				nopreview: true,
			})

			const chunks = []
			myCamera
				.snap()
				.then(result => {
					//const readStream = fs.createReadStream(
					//	path.resolve(
					//		__dirname,
					//		`./intruder/intruder${intruderNr}_${intruderDate}.jpg`
					//	),
					//	{
					//		encoding: 'binary',
					//	}
					//)

					console.log('Image taken', result)
					fs.readFile(
						`${__dirname}/intruder/intruder${intruderNr}_${intruderDate}.jpg`,
						function(err, buff) {
							if (err) {
								throw err
							}
							socket.emit('img-chunk', {
								image: true,
								buffer: buff.toString('base64'),
							})
						}
					)
					// readStream.on('data', function(chunk) {
					// 	chunks.push(chunk)
					// 	socket.emit('img-chunk', chunk)
					// })
					intruderNr += 1
				})
				.catch(error => {
					throw error
				})

			socket.emit('intruder', value)
			pir.unwatch()
		}
	})

	/* socket.on('greet', function(data) {
		console.log(data)
		// LED.writeSync(1)
		socket.emit('respond', { hello: 'Hey, Mr.Client!' })
	}) */

	socket.on('intruderAction', function(data) {
		if (data === 1) {
			console.log('Calling 112!!!')
			const blinkInterval = setInterval(blinkLED, 250)
			setTimeout(function() {
				clearInterval(blinkInterval)
				LED.writeSync(0)
				socket.emit('intruderFixed', 'Intruder caught!!!')
			}, 5000)
		} else {
			console.log('Intruder safe')
			LED.writeSync(data)
			socket.emit('intruderFixed', 'Intruder let in!!!')
		}
	})
})

process.on('SIGINT', function(code) {
	LED.writeSync(0)
	LED.unexport()
	pir.unexport()
	fs.writeFileSync(logPath, `${new Date().toString()}`)
	process.exit()
})
