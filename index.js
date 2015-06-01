'use strict';
var stream = require('stream');
var Readable = stream.Readable;
var PassThrough = stream.PassThrough;


function handleError(outputStream, next, error) {
	process.nextTick(function() {
		if (!outputStream._writableState.ended) {
			outputStream.emit('error', error);
			outputStream.end();
		}

		if (next) {
			next();
		}
	});
}

/**
 * Given an ordered list of streams and Buffers, streamCat will pipe each stream or buffer to
 * the writable stream in order.
 */
function streamCat(streams, writeable, endCallback) {

    var concatenate = streams.reduceRight(function(next, stream) {
		// Set up all 'Stream' error handlers immediately.
		if (isReadableStream(stream)) {
			stream.on('error', handleError.bind(null, writeable, next));
		}

        return function() { handleStream(stream, writeable, next); };
    }, endCallback);

	concatenate();
}

function handleStream(inputStream, outputStream, next) {


	if (inputStream instanceof Buffer) {

		process.nextTick(function() {
			if (!outputStream._writableState.ended) {
				outputStream.write(inputStream);
			}

			next();
		});

	} else if (inputStream instanceof Promise || (inputStream.then && inputStream.catch)) {

		inputStream.then(function(content) {
			return streamCat([content], outputStream, next);
		}).catch(handleError.bind(null, outputStream, next));

	} else if (isReadableStream(inputStream)) {
		inputStream.on('data', function(chunk, enc) {
			// Don't try and write if the writing end is closed
			if (!outputStream._writableState.ended) {
				outputStream.write(chunk, enc);
			}
		});

		inputStream.on('end', function() {
			next();
		});

	} else {
		process.nextTick(function() {
			handleError.call(null, outputStream, next, new Error("Invalid stream component '" + (typeof inputStream) + "', must be: stream.Readable, Buffer, or Promise"));
		});
	}
}

function isReadableStream(stream) {
	return stream instanceof Readable || (stream.on && stream.read);
}

module.exports = function(streams) {
	var passThrough = new PassThrough();
	var streamCatBufferedError = null;

	var originalPassthroughOn = passThrough.on.bind(passThrough);

	// Complex: Node's EventEmitter will fire and forget events - if there is
	// nothing listening then the event is forgotten.  In the case of 'error'
	// events, if there are no listeners then an exception is thrown inside
	// the emitter.  To avoid this and to give some time to attach error
	// handlers to the final composed stream, if an error occurs _before_ an
	// error handler has been attached it gets buffered.  Then, when the
	// appropriate event handler is attached, the event is fired and the
	// appropriate handler can pick the error up.
	//
	function bufferError(error) {
		streamCatBufferedError = error;
	}

	passThrough.once('error', bufferError);

	passThrough.on = function(ev, handler) {
		originalPassthroughOn(ev, handler);

		if (ev === 'error') {
			if (streamCatBufferedError !== null) {
				this.removeListener('error', bufferError);
				this.emit(ev, streamCatBufferedError);
				streamCatBufferedError = null;
			}

			passThrough.on = originalPassthroughOn;
		}
	}.bind(passThrough);

	streamCat(streams, passThrough, function() {
		if (!passThrough._writableState.ended)  {
			passThrough.end();
		}
	});
	return passThrough;
};
