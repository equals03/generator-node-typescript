# What happend behind the scenes?

Well, first off... all the hard work :)

In the box you have:
* full VS Code intellisense in your source files and within your typeescript tests
* type declaration management via npm
* gulp tasks for just about everything
* matching npm tasks (that forward the call to gulp) via npm run

To install an additional type declaration, just -
```sh
npm install @typings/mocha --save-dev
```

When you run `gulp build`, your _build_ directory structure should looks like -

```sh
.
├── build
│   ├── index.d.ts
│   ├── index.js
```