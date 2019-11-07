module.exports = {
  chainWebpack: config => {
    // config.module.rule('images')
    const imagesRule = config.module.rule('images')

    // 清除已有的所有 loader。
    // 如果你不这样做，接下来的 loader 会附加在该规则现有的 loader 之后。
    imagesRule.uses.clear()

    // 添加要替换的 loader
    imagesRule
      .test(/\.(png|jpe?g|gif|webp)(\?.*)?$/i)
      .use([{
        loader: 'url-loader',
        options: {
          limit: 4096,
          fallback: {
            loader: 'file-loader',
            options: {
              name: 'img/[name].[hash:8].[ext]'
            }
          }
        }
      }])
      .loader('url-loader')
  }
}
