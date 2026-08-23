// The CommonJS entry. Exporting only a default makes the bundler emit
// `module.exports = ransu` rather than `exports.default = ransu`, so
// `require('ransu')` yields the namespace itself. Named exports still
// destructure, because they are also properties of the namespace.
export { ransu as default } from "./namespace";
