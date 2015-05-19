'use strict';
var PassThrough = require('stream').PassThrough;

/**
 * Given an ordered list of streams and Buffers, streamCat will pipe each stream or buffer to
 * the writable stream in order.
 */
function streamCat(streams, writeable, endCallback) {

    var concatenate = streams.reduceRight(function(next, stream) {
        return function() { handleStream(stream, writeable, next); };
    }, endCallback);

    concatenate();
}

function handleStream(inputStream, outputStream, next) {
	if (inputStream instanceof Buffer) {
		outputStream.write(inputStream);
		process.nextTick(next);
	} else if (inputStream instanceof Promise) {
		inputStream.then(function(content) {
			return handleStream(content, outputStream, next);
		}).catch(handleError);
	} else {
		inputStream.on('data', function(chunk, enc) {
			outputStream.write(chunk, enc);
		});

		inputStream.on('end', function() {
			next();
		});

		inputStream.on('error', handleError);
	}

	function handleError(error) {
		outputStream.emit('error', error);
		outputStream.end();
	}
}

module.exports = function(streams) {
	var passThrough = new PassThrough();

	streamCat(streams, passThrough, function() { passThrough.end(); });
	return passThrough;
};
