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

`streamCat` will take a list of `ReadStream`s, `Buffer`s, or `Promise`s
returning a `ReadStream` or `Buffer` as its only
argument and returns a `ReadStream` that will stream the concatenation of each
item in the list.

You can mix `Buffer`, `ReadStream`, and `Promise` usage, in this instance, the `String`
`"Some content"` will be streamed between `myfileA` and `myfileB`:

```JS
streamCat([
	fs.createReadStream('myfileA'),
	new Buffer("Some content"),
	fs.createReadStream('myfileB')
]).pipe(process.stdout);
```

Example using `Promise`s that has the same result as the above example, the
value in the `Promise` is resolved asynchronously:

```JS
streamCat([
	fs.createReadStream('myfileA'),
	Promise.resolve(new Buffer("Some content")),
	fs.createReadStream('myfileB')
]).pipe(process.stdout);

```

## License

MIT
