const { get } = require('../../utils/request');
const { getUserInfo, clearAll } = require('../../utils/storage');

Page({
  data: {
    userInfo: null,
    pendingCount: 0,
    loading: false
  },

  onLoad() {
    this.checkAdminAccess();
    this.loadUserInfo();
    this.loadPendingCount();
  },

  onShow() {
    this.checkAdminAccess();
    this.loadUserInfo();
    this.loadPendingCount();
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadUserInfo(),
      this.loadPendingCount()
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  checkAdminAccess() {
    const userInfo = getUserInfo();
    if (!userInfo || userInfo.role !== 'admin') {
      wx.showToast({
        title: '无权限访问',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }, 1500);
      return false;
    }
    return true;
  },

  loadUserInfo() {
    const userInfo = getUserInfo();
    this.setData({ userInfo });
  },

  loadPendingCount() {
    this.setData({ loading: true });
    
    get('/admin/orders/pending')
      .then(res => {
        if (res.code === 200) {
          const pendingCount = (res.data || []).length;
          this.setData({ 
            pendingCount,
            loading: false 
          });
        } else {
          this.setData({ loading: false });
          wx.showToast({
            title: res.message || '加载失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('Load pending count error:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      });
  },

  goToPendingOrders() {
    wx.navigateTo({
      url: '/pages/admin-pending/admin-pending'
    });
  },

  goToCompletedOrders() {
    wx.navigateTo({
      url: '/pages/admin-completed/admin-completed'
    });
  },

  goToAnnouncements() {
    wx.navigateTo({
      url: '/pages/admin-announcements/admin-announcements'
    });
  },

  goToEvaluations() {
    wx.navigateTo({
      url: '/pages/admin-evaluations/admin-evaluations'
    });
  },

  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          clearAll();
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      }
    });
  }
});