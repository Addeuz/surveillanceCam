const PiCamera = require('pi-camera')

const myCamera = new PiCamera({
	mode: 'photo',
	output: `${__dirname}/intruder/test.jpg`,
	width: 500,
	height: 500,
	nopreview: true,
})

myCamera
	.snap()
	.then(result => {
		console.log('Image taken', result)
	})
	.catch(error => {
		throw error
	})
