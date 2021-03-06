'use strict';
var stream = require('stream');
var bufferError = require('promisebuffer').bufferError;
var Readable = stream.Readable;
var PassThrough = stream.PassThrough;

module.exports = function(streams, options) {
	var opts = options || {};
	var errorMapper = opts.errorMapper || function(e) { return e; };

	function handleError(outputStream, next, error) {
		process.nextTick(function() {
			if (!outputStream._writableState.ended) {
				outputStream.emit('error', errorMapper(error));
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

	var passThrough = bufferError(new PassThrough());

	streamCat(streams, passThrough, function() {
		if (!passThrough._writableState.ended)  {
			passThrough.end();
		}
	});
	return passThrough;
};
