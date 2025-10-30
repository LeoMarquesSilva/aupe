module.exports = {
  plugins: [
    require('autoprefixer'),
    // Removendo postcss-preset-env temporariamente para resolver o erro
    // require('postcss-preset-env')({
    //   stage: 3,
    //   features: {
    //     'custom-properties': false
    //   }
    // })
  ]
}