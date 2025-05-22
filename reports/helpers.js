export function groupBy(arr, key) {
  return arr.reduce(function (acc, curr) {
    ;(acc[curr[key]] = acc[curr[key]] || []).push(curr)
    return acc
  }, {})
}

// function sortBy(property) {
//   let sortOrder = 1

//   // Sort inverter (asc/des)
//   if (property[0] === '-') {
//     sortOrder = -1
//     property = property.substr(1)
//   }

//   return function (a, b) {
//     /* Works with strings and numbers */
//     const result =
//       a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0

//     return result * sortOrder
//   }
// }

// function sortByMultiple() {
//   const props = arguments
//   return function (obj1, obj2) {
//     let i = 0
//     let result = 0
//     const numberOfProperties = props.length

//     while (result === 0 && i < numberOfProperties) {
//       result = sortBy(props[i])(obj1, obj2)
//       i++
//     }
//     return result
//   }
// }
