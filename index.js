'use strict';
var stream = require('stream');
var Readable = stream.Readable;
var PassThrough = stream.PassThrough;

/**
 * Given an ordered list of streams and Buffers, streamCat will pipe each stream or buffer to
 * the writable stream in order.
 */
function streamCat(streams, writeable, endCallback) {

    var concatenate = streams.reduceRight(function(next, stream) {
        return function() { handleStream(stream, writeable, next); };
    }, endCallback);

	process.nextTick(concatenate);
}

function handleStream(inputStream, outputStream, next) {
	if (inputStream instanceof Buffer) {
		outputStream.write(inputStream);
		process.nextTick(next);
	} else if (inputStream instanceof Promise || (inputStream.then && inputStream.catch)) {
		inputStream.then(function(content) {
			return handleStream(content, outputStream, next);
		}).catch(handleError);
	} else if (inputStream instanceof Readable || (inputStream.on && inputStream.read)) {
		inputStream.on('data', function(chunk, enc) {
			outputStream.write(chunk, enc);
		});

		inputStream.on('end', function() {
			next();
		});

		inputStream.on('error', handleError);
	} else {
		process.nextTick(function() {
			handleError(new Error("Invalid stream component '" + (typeof inputStream) + "', must be: stream.Readable, Buffer, or Promise"));
		});
	}

	function handleError(error) {
		process.nextTick(function() {
			outputStream.emit('error', error);
			outputStream.end();
		});
	}
}


module.exports = function(streams) {
	var passThrough = new PassThrough();
	passThrough.__streamCatBufferedError = null;

	var originalPassthroughOn = passThrough.on.bind(passThrough);

	// Complex: Node's EventEmitter will fire and forget events - if there is
	// nothing listening then the event is forgotten.  In the case of 'error'
	// events, if there are no listeners then an exception is thrown inside
	// the emitter.  To avoid this and to give some time to attach error
	// handlers to the final composed stream, if an error occurs _before_ an
	// error handler has been attached it gets buffered.  Then, when the
	// appropriate event handler is attached, the event is fired and the
	// appropriate handler can pick the error up.
	originalPassthroughOn('error', function(error) {
		this.__streamCatBufferedError = error;
	}.bind(passThrough));

	passThrough.on = function(ev, handler) {
		originalPassthroughOn(ev, handler);

		if (ev === 'error') {
			if (this.__streamCatBufferedError !== null) {
				this.emit(ev, this.__streamCatBufferedError);
			}

			passThrough.on = originalPassthroughOn;
		}
	}.bind(passThrough);

	streamCat(streams, passThrough, function() { passThrough.end(); });
	return passThrough;
};
