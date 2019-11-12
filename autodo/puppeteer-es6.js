const puppeteer = require('puppeteer')

const userList = [
  {
    user: '',
    pwd: ''
  },
  {
    user: '',
    pwd: ''
  }
]

async function automation(user, pwd) {

  const browser = await puppeteer.launch({
    //设置超时时间
    timeout: 30000,
    //如果是访问https页面 此属性会忽略https错误
    ignoreHTTPSErrors: true,
    // 打开开发者工具, 当此值为true时, headless总为false
    devtools: false,
    // 关闭headless模式, 不会打开浏览器(tips:此选项为false会导致打不出pdf)
    headless: false
  })

  //打开一个新的标签页
  const page = await browser.newPage()

  //指定进入的地址
  const url = 'https://mp.weixin.qq.com'

  //进入指定网址，networkidle0 参数将指定请求连接为0的时候才完成导航，也就是网页加载完毕。
  await page.goto(url, {waitUntil: 'networkidle0'})
  await page.type('[name="account"]', user)
  await page.type('[name="password"]', pwd)
  await page.click('.btn_login')
  await page.waitForSelector('#menuBar') // 等待扫码成功后，当前页面出现这个选择器后执行下一步。
  await page.goto(`${url}/wxamp/wacodepage/getcodepage?${page.url().split('?')[1]}`, {waitUntil: 'networkidle0'})
  const el = await page.$$('.code_version_dev .code_version_log_ft')
  await el[el.length - 1].click()
  await page.waitFor(1000)
  await page.click('.weui-desktop-icon-checkbox')
  await page.click('.code_submit_dialog .weui-desktop-btn_primary')
  await page.click('.muti_msg_dialog .weui-desktop-btn_primary')
  await page.waitFor(2000)
  const pages = (await browser.pages())[2]
  await pages.click('.tool_bar')
  //关闭 headless chrome
  await browser.close()
}

userList.reduce(async (prev, next) => {
  await prev
  return automation(next.user, next.pwd)
}, Promise.resolve())











