# streamcat

Concatenate Node JS ReadStreams!

## Usage

Example, print the contents of `myfileA` followed by `myfileB`, this is
equivalent to using `cat(1)`: `cat myfileA myfileB`.

```JS
var streamCat = require('streamcat');

streamCat([
	fs.createReadStream('myfileA'),
	fs.createReadStream('myfileB')
]).pipe(process.stdout);
```

### API

#### `streamCat(listOfStreamsOrBuffers)`

`streamCat` will take a list of `ReadStream`s or `Buffer`s as its only
argument and returns a `ReadStream` that will stream the concatenation of each
item in the list.

You can mix `Buffer` and `ReadStream` usage, in this instance, the `String`
`"Some content"` will be streamed between `myfileA` and `myfileB`:

```JS
streamCat([
	fs.createReadStream('myfileA'),
	new Buffer*("Some content"),
	fs.createReadStream('myfileB')
]).pipe(process.stdout);
```

## License

MIT
