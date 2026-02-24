// 统计脚本 ID 通过环境变量配置，不提交到仓库，避免开源后统计被污染
// 部署时设置 BAIDU_ANALYTICS_ID=你的百度统计hm.js?id 即可
module.exports = {
  baiduAnalyticsId: (process.env.BAIDU_ANALYTICS_ID || "").trim(),
};
