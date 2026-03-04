const { get } = require('../../utils/request');
const { getUserInfo, clearAll } = require('../../utils/storage');

Page({
  data: {
    userInfo: null,
    announcements: [],
    loading: false,
    currentSwiper: 0
  },

  onLoad() {
    this.loadUserInfo();
    this.loadAnnouncements();
  },

  onShow() {
    this.loadUserInfo();
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadUserInfo(),
      this.loadAnnouncements()
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadUserInfo() {
    // 从服务器获取完整用户信息
    get('/user/profile')
      .then(res => {
        if (res.code === 200) {
          // 更新本地存储
          const userInfo = res.data;
          wx.setStorageSync('userInfo', userInfo);
          this.setData({ userInfo });
        } else {
          // 如果请求失败，使用本地缓存
          const userInfo = getUserInfo();
          this.setData({ userInfo });
        }
      })
      .catch(() => {
        // 如果网络错误，使用本地缓存
        const userInfo = getUserInfo();
        this.setData({ userInfo });
      });
  },




  loadAnnouncements() {
    this.setData({ loading: true });
    
    get('/announcements')
      .then(res => {
        if (res.code === 200) {
          const announcements = (res.data || []).slice(0, 5);
          this.setData({ 
            announcements,
            loading: false 
          });
        } else {
          this.setData({ loading: false });
          wx.showToast({
            title: res.message || '加载公告失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('Load announcements error:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      });
  },

  onSwiperChange(e) {
    this.setData({
      currentSwiper: e.detail.current
    });
  },

  goToRepair() {
    wx.navigateTo({
      url: '/pages/student-repair/student-repair'
    });
  },

  goToRecords() {
    wx.navigateTo({
      url: '/pages/student-records/student-records'
    });
  },

  goToEvaluation() {
    wx.navigateTo({
      url: '/pages/student-evaluation/student-evaluation'
    });
  },
  goToProfile() {
    wx.navigateTo({
      url: '/pages/student-profile/student-profile'
    });
  },

  viewAnnouncement(e) {
    const { index } = e.currentTarget.dataset;
    const announcement = this.data.announcements[index];
    if (announcement) {
      wx.showModal({
        title: announcement.title,
        content: announcement.content,
        showCancel: false,
        confirmText: '知道了'
      });
    }
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