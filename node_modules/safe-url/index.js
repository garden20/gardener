// Thx Mikeal (ripped from the guts of couchapp)
module.exports = function safeUrl(url) {
  return url.replace(/^(https?:\/\/[^@:]+):[^@]+@/, '$1:******@');
};
