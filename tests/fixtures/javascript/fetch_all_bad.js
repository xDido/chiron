// Hero fixture for the JavaScript language pack.
//
// Intentional bugs seeded for /challenge:
//   1. `js:var-in-new-code`       — var used instead of const/let
//   2. `js:loose-equality`        — == and != used
//   3. `js:or-truthiness-trap`    — || for default where 0/"" are valid
//   4. `js:callback-hell`         — nested callbacks instead of async/await
//   5. `js:serial-await`          — sequential awaits for independent work
//   6. `js:unhandled-rejection`   — fire-and-forget Promise without .catch
//   7. `js:mutate-arguments`      — mutates the caller's array
//   8. `js:throw-string`          — throws a string instead of an Error
//
// This file is NOT meant to be idiomatic. Treat it as a practice target.

// Legacy callback-based network stub (simulating an older library).
function fetchUser(id, cb) {
  setTimeout(() => cb(null, { id, name: "Alice", limit: 0 }), 10);
}
function fetchPosts(userId, cb) {
  setTimeout(() => cb(null, [{ id: 1, title: "hi" }]), 10);
}
function fetchComments(postId, cb) {
  setTimeout(() => cb(null, [{ id: 1, body: "first" }]), 10);
}

// Bug 4: callback hell, bug 2: == null checks, bug 8: throw string.
function loadThreadCallbacks(id, cb) {
  fetchUser(id, function (err, user) {
    if (err != null) return cb(err);
    if (user == undefined) return cb("user missing"); // throw-string analog
    fetchPosts(user.id, function (err, posts) {
      if (err != null) return cb(err);
      fetchComments(posts[0].id, function (err, comments) {
        if (err != null) return cb(err);
        cb(null, { user: user, posts: posts, comments: comments });
      });
    });
  });
}

// Bug 1: var. Bug 5: serial awaits. Bug 6: fire-and-forget telemetry.
async function loadDashboard(userId) {
  var user = await fetchUserAsync(userId);
  var posts = await fetchPostsAsync(userId); // independent of `user`, parallelizable
  var comments = await fetchCommentsAsync(userId); // also independent

  sendTelemetry("dashboard_loaded"); // returns a Promise, nobody awaits or catches
  return { user: user, posts: posts, comments: comments };
}

async function fetchUserAsync(id) {
  return { id, name: "Alice", limit: 0 };
}
async function fetchPostsAsync(userId) {
  return [{ id: 1, title: "hi" }];
}
async function fetchCommentsAsync(userId) {
  return [{ id: 1, body: "first" }];
}
async function sendTelemetry(event) {
  // pretend this hits a network
  return event;
}

// Bug 3: || trap drops 0. Bug 7: mutates caller's array.
function applyConfig(items, config) {
  var timeout = config.timeout || 5000; // 0 becomes 5000
  var name = config.name || "anonymous"; // "" becomes "anonymous"
  items.sort(); // mutates caller's array
  return { timeout: timeout, name: name, items: items };
}

// Bug 2: bare == null used where === null or strict null/undefined would do.
function greet(user) {
  if (user == null) {
    throw "missing user"; // bug 8 again — should be new Error(...)
  }
  return "hello " + user.name;
}

module.exports = {
  loadThreadCallbacks,
  loadDashboard,
  applyConfig,
  greet,
};
