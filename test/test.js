var streamCat = require('../index');
var assert = require('assert');
var fs = require('fs');
var path = require('path');

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

	it("should recursively resolve any Promise values passed to the streams", function(done) {
		var readStreamPromiseA = Promise.resolve(streamCat([new Buffer("A")]));
		var readBufferPromiseB  = Promise.resolve(new Buffer("B"));

		var readStream = streamCat([readStreamPromiseA, readBufferPromiseB]);

		bufferStream(readStream).then(function(streamContent) {
			assert.equal("AB", streamContent);
			done();
		}).catch(done);
	});

	it("should pass through any errors generated from a Promise to the stream", function(done) {
		var readStreamPromiseFail = Promise.reject(new Error("fail"));
		var readStream = streamCat([readStreamPromiseFail]);

		readStream.on("error", function(error) {
			assert.equal(error.message, "fail");
			done();
		});
	});

	it("should pass through any errors from concatenated streams", function(done) {
		var readStreamFail = streamCat([Promise.reject(new Error("fail"))]);
		var readStream = streamCat([readStreamFail]);

		readStream.on("error", function(error) {
			assert.equal(error.message, "fail");
			done();
		});
	});

	it("should pass through errors from the concatenated stream, even if preceeding concatenated stream object were succeessful", function(done) {
		var readStreamOk = streamCat([new Buffer("A")]);
		var readStreamFail = streamCat([Promise.reject(new Error("fail"))]);

		var readStream = streamCat([readStreamOk, readStreamFail]);
		readStream.on("error", function(error) {
			assert.equal(error.message, "fail");
			done();
		});
	});

	it("should pass through the first error it encounters", function(done) {
		var readStreamOk = streamCat([new Buffer("A")]);
		var readStreamFailA = streamCat([Promise.reject(new Error("failA"))]);
		var readStreamFailB = streamCat([Promise.reject(new Error("failB"))]);

		var readStream = streamCat([readStreamOk, readStreamFailA, readStreamFailB]);
		readStream.on("error", function(error) {
			assert.equal(error.message, "failA");
			done();
		});
	});

	it("should throw an error when encountering an invalid stream component type", function(done) {
		var badStream = streamCat([{ an: "object" }]);

		badStream.on("error", function(error) {
			assert.equal(error.message, "Invalid stream component 'object', must be: stream.Readable, Buffer, or Promise");
			done();
		});
	});

	it("should concatenate real streams", function(done) {
		var testFile = path.join(__dirname, 'test.txt');
		var streamA = fs.createReadStream(testFile);
		var streamB = fs.createReadStream(testFile);

		var readStream = streamCat([streamA, streamB]);

		bufferStream(readStream).then(function(buffer) {
			assert.equal(buffer, "dummy content to stream\ndummy content to stream\n");
			done();
		}).catch(done);
	});

	it("should concatenate real streams with errors", function(done) {
		var testFile = path.join(__dirname, 'test.txt');
		var nonExistantTestFile = '/i/dont/exist/i/hope';

		var streamA = fs.createReadStream(testFile);
		var streamErr = fs.createReadStream(nonExistantTestFile);

		var readStream = streamCat([streamA, streamErr]);

		readStream.on('error', function(error) {
			assert.equal(error.code, 'ENOENT');
			done();
		});
	});

	it("should concatenate real streams with errors, and ensure all other streams are drained", function(done) {
		var testFile = path.join(__dirname, 'test.txt');
		var nonExistantTestFile = '/i/dont/exist/i/hope';

		var streamA = fs.createReadStream(testFile);
		var streamErr = fs.createReadStream(nonExistantTestFile);
		var streamB = fs.createReadStream(testFile);

		var errorHandled = false;

		streamB.on('close', function() {
			assert.equal(errorHandled, true);
			done();
		});

		var readStream = streamCat([streamA, streamErr, streamB]);

		readStream.on('error', function(error) {
			assert.equal(error.code, 'ENOENT');
			errorHandled = true;
		});
	});

	it("should concatenate real streams with errors, and ensure all other streams are drained, but only emit the first error", function(done) {
		var testFile = path.join(__dirname, 'test.txt');
		var nonExistantTestFile = '/i/dont/exist/i/hope';

		var streamA = fs.createReadStream(testFile);
		var streamErr = fs.createReadStream(nonExistantTestFile);
		var streamB = fs.createReadStream(testFile);
		var streamErr2 = fs.createReadStream(nonExistantTestFile);

		var errorHandled = false;

		streamB.on('close', function() {
			assert.equal(errorHandled, true);
			done();
		});

		var readStream = streamCat([streamA, streamErr, streamErr2, streamB]);

		readStream.on('error', function(error) {
			assert.equal(error.code, 'ENOENT');

			if (errorHandled === true) {
				throw new Error("error was handled twice");
				return;
			}

			errorHandled = true;
		});
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
