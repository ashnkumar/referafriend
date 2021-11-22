
function akParse(obj) {
  if (!obj) return obj
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint'
      ? value.toString()
      : value // return everything else unchanged
     ));
 }

module.exports = {
  akParse
}