const fs = require('fs')

const path = '/home/pi/Documents/Code/surveillanceCam/log/logfile.txt'

const dataBuffer = fs.readFileSync(path)
let dataString = ''
// eslint-disable-next-line no-unused-expressions
dataBuffer.toString() === '' ? (dataString = null) : (dataString = dataBuffer.toString())

console.log(dataString)

process.on('SIGINT', function() {
	fs.writeFileSync(path, `${new Date().toString()}- Shutdown with Ctrl + C`)
	process.exit()
})

process.stdin.resume()
