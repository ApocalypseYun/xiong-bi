const { get } = require('../../utils/request.js');

Page({
  data: {
    pendingCount: 0,
    myActiveOrders: [],
    myCompletedCount: 0,
    userInfo: {}
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({ userInfo });
  },

  onShow() {
    this.loadDashboard();
  },

  async loadDashboard() {
    try {
      const [pendingRes, myRes] = await Promise.all([
        get('/repairman/orders/pending'),
        get('/repairman/orders/mine')
      ]);
      const myOrders = myRes.code === 200 ? myRes.data : [];
      const activeOrders = myOrders.filter(o => o.status === 'processing');
      const completedCount = myOrders.filter(o => o.status === 'completed').length;
      this.setData({
        pendingCount: pendingRes.code === 200 ? pendingRes.data.length : 0,
        myActiveOrders: activeOrders,
        myCompletedCount: completedCount
      });
    } catch (err) {
      console.error('加载仪表盘失败', err);
    }
  },

  goToPending() { wx.navigateTo({ url: '/pages/repairman-orders/repairman-orders' }); },
  goToActive() { wx.navigateTo({ url: '/pages/repairman-active/repairman-active' }); },

  handleLogout() {
    wx.clearStorageSync();
    wx.redirectTo({ url: '/pages/index/index' });
  }
});
