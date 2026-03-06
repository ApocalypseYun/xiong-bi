const { get } = require('../../utils/request.js');

Page({
  data: {
    pendingCount: 0,
    myActiveOrders: [],
    myCompletedCount: 0,
    evaluationCount: 0,
    userInfo: {},
    announcements: [],
    currentSwiper: 0
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({ userInfo });
  },

  onShow() {
    this.loadDashboard();
    this.loadAnnouncements();
  },

  async loadDashboard() {
    try {
      const [pendingRes, myRes, evalRes] = await Promise.all([
        get('/repairman/orders/pending'),
        get('/repairman/orders/mine'),
        get('/evaluations/repairman')
      ]);
      
      const myOrders = myRes.code === 200 ? myRes.data : [];
      const activeOrders = myOrders.filter(o => o.status === 'processing');
      const completedCount = myOrders.filter(o => o.status === 'completed').length;
      const evaluationCount = evalRes.code === 200 ? evalRes.data.length : 0;
      
      this.setData({
        pendingCount: pendingRes.code === 200 ? pendingRes.data.length : 0,
        myActiveOrders: activeOrders,
        myCompletedCount: completedCount,
        evaluationCount
      });
    } catch (err) {
      console.error('加载仪表盘失败', err);
    }
  },

  async loadAnnouncements() {
    try {
      const res = await get('/announcements?active=true');
      if (res.code === 200) {
        const announcements = (res.data || []).map(item => ({
          ...item,
          createdAt: this.formatDate(item.createdAt)
        }));
        this.setData({ announcements });
      }
    } catch (err) {
      console.error('加载公告失败', err);
    }
  },

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}-${date.getDate()}`;
  },

  onSwiperChange(e) {
    this.setData({ currentSwiper: e.detail.current });
  },

  viewAnnouncement(e) {
    const index = e.currentTarget.dataset.index;
    const announcement = this.data.announcements[index];
    if (announcement) {
      wx.showModal({
        title: announcement.title,
        content: announcement.content,
        showCancel: false
      });
    }
  },

  goToPending() { 
    wx.navigateTo({ url: '/pages/repairman-orders/repairman-orders' }); 
  },
  
  goToActive() { 
    wx.navigateTo({ url: '/pages/repairman-active/repairman-active' }); 
  },

  goToEvaluations() {
    wx.navigateTo({ url: '/pages/repairman-evaluations/repairman-evaluations' });
  },

  handleLogout() {
    wx.clearStorageSync();
    wx.redirectTo({ url: '/pages/index/index' });
  }
});
