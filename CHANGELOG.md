# Changelog

## v0.5.3

* 📈 Add fall back processing to get `globalThis`, `Object`, and `Function`. (to check for unsafe keywords)
* Update dependencies.


## ~~v0.5.2~~

* Failed to release it.😣


## v0.5.1

* 📈 Stricter lint checking.
* 🐞[FIX] Fix `like` pattern escaping.
* Update dependencies.


## v0.5.0
### ⚠️ Breaking changes
* 💥 Change `getIndexFieldConditions()` parameters.

### 🟢 Other changes
* 🐞`[FIX]` Fix `getIndexFieldConditions()`.
  * Check operand 2.
  * Fix array expansion.
* 🐞`[FIX]` Fix `Date` and `Datetime` parameter expansion of SOQL function calls.
* 📈 Improve typings; Strictly define the type of template string parameters.
* Update README.
* Update dependencies.


---

## v0.4.1

* ✨`[NEW]` Add `getIndexFieldConditions()` function that gets the transformed conditions that include only the fields you specified.
* Update README.
* Update CI configurations (GitHub Actions: remove node 13).


## v0.4.0

* ✨`[NEW]` Add SOQL scalar function `convertTimezone()`.
* 📈 Memoize the `immediate-scalar` function calls.
* 📈 Improves the performance of the standard resolvers.
* 📈 Improves the performance of sorting.
* 📈 Improves the performance of filtering.
* Update README.
* Update dependencies.


---

## v0.3.1

* ✨`[NEW]` Add `notifyRemoved()` function that publish DML `remove` event. (to notify remote changes)
* ✨`[NEW]` Add `unsubscribeAllBySubscriber()` function.
* Update README.


## v0.3.0

* ✨`[NEW]` Publish / Subscribe messaging. (Subscribe to DML events)
* Update README.
* Update dependencies.


---

## v0.2.2

* 📈 Improve typings.
* Update README.


## v0.2.1

* ✨`[NEW]` Pre-compiled query.
* ✨`[NEW]` Named parameterized query.
* 🐞`[FIX]` The values ​​for `limit` and `offset` must be settable in the template string literal parameters.
* Update README.
* Update dependencies.


## v0.2.0

* ✨`[NEW]` Nested scalar/aggregate function calls.
* 🐞`[FIX]` Nested function on relational query result is broken.
* 📈 Improve `select` query performance.
* 📈 Improve typings.
* Update README.
* Update dependencies.


---

## v0.1.1

* 🐞`[FIX]` Fix CSV resolver: Column names should be not dangerous names.
* Improve README.


## v0.1.0

* First stable release🎉

