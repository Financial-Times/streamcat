var streamCat = require('../index');
var assert = require('assert');

describe("streamCat(streams)", function() {

	it("should create a ReadStream concatenating the given Buffers in order", function(done) {
		var readStream = streamCat([new Buffer("1"), new Buffer("2")]);

		bufferStream(readStream).then(function(streamContent) {
			assert.equal("12", streamContent);
			done();
		}).catch(done);
	});

	it("should create a ReadStream concatenating the given ReadStreams in order", function(done) {
		var readStreamA = streamCat([new Buffer("A")]);
		var readStreamB = streamCat([new Buffer("B")]);

		var readStream = streamCat([readStreamA, readStreamB]);

		bufferStream(readStream).then(function(streamContent) {
			assert.equal("AB", streamContent);
			done();
		}).catch(done);
	});

	it("should concatenate a mix of ReadStreams and Buffer objects in order", function(done) {
		var readStreamA = streamCat([new Buffer("A")]);
		var bufferB = new Buffer("B");
		var readStreamC = streamCat([new Buffer("C")]);

		var readStream = streamCat([readStreamA, bufferB, readStreamC]);

		bufferStream(readStream).then(function(streamContent) {
			assert.equal("ABC", streamContent);
			done();
		}).catch(done);
	});
});

function bufferStream(stream) {
	return new Promise(function(resolve, reject) {
		var buffer = "";
		stream.on('data', function(chunk) {
			buffer += chunk.toString();
		});

		stream.on('end', function() {
			resolve(buffer);
		});
	});
}
