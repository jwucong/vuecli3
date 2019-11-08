
function f() {
  return new Promise((resolve, reject) => {
    // return resolve(1)
    const re = reject(2)
    console.log(re)
  })
}

f().then(res => {
  console.log('res: ', res)
}).catch(err => {
  console.log('err: ', err)
})