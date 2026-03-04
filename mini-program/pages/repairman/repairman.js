// pages/repairman/repairman.js
const { get, post } = require('../../utils/request');

Page({
  data: {
    currentTab: 'pending',
    pendingOrders: [],
    myOrders: [],
    completedOrders: [],
    loading: false
  },

  onLoad() {
    this.checkPermission();
    this.loadOrders();
  },

  onShow() {
    this.loadOrders();
  },

  checkPermission() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || userInfo.role !== 'repairman') {
      wx.showModal({
        title: '权限不足',
        content: '仅维修工可访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  async loadOrders() {
    this.setData({ loading: true });
    try {
      // 获取待接单列表
      const pendingRes = await get('/admin/orders/pending');
      // 获取我的处理中订单
      const myRes = await get('/orders?status=processing');
      // 获取我的已完成订单
      const completedRes = await get('/orders?status=completed');

      if (pendingRes.code === 200) {
        this.setData({ pendingOrders: pendingRes.data || [] });
      }
      if (myRes.code === 200) {
        this.setData({ myOrders: myRes.data || [] });
      }
      if (completedRes.code === 200) {
        this.setData({ completedOrders: completedRes.data || [] });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  // 接单
  async acceptOrder(e) {
    const { id } = e.currentTarget.dataset;
    try {
      const res = await post(`/admin/orders/${id}/accept`);
      if (res.code === 200) {
        wx.showToast({ title: '接单成功', icon: 'success' });
        this.loadOrders();
      } else {
        wx.showToast({ title: res.message || '接单失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '接单失败', icon: 'none' });
    }
  },

  // 完成订单（上传图片）
  completeOrder(e) {
    const { id } = e.currentTarget.dataset;
    wx.chooseImage({
      count: 3,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        this.uploadCompletionImages(id, res.tempFilePaths);
      }
    });
  },

  uploadCompletionImages(orderId, filePaths) {
    const token = wx.getStorageSync('token');
    let uploadedCount = 0;
    const imageUrls = [];

    wx.showLoading({ title: '上传中...' });

    filePaths.forEach(filePath => {
      wx.uploadFile({
        url: getApp().globalData.baseUrl + '/upload',
        filePath: filePath,
        name: 'file',
        header: { 'Authorization': `Bearer ${token}` },
        success: (res) => {
          const data = JSON.parse(res.data);
          if (data.code === 200) {
            imageUrls.push(data.data.url);
          }
          uploadedCount++;
          if (uploadedCount === filePaths.length) {
            this.submitCompletion(orderId, imageUrls);
          }
        },
        fail: () => {
          uploadedCount++;
          if (uploadedCount === filePaths.length) {
            this.submitCompletion(orderId, imageUrls);
          }
        }
      });
    });
  },

  async submitCompletion(orderId, imageUrls) {
    try {
      const res = await post(`/admin/orders/${orderId}/complete`, {
        images: imageUrls
      });
      wx.hideLoading();
      if (res.code === 200) {
        wx.showToast({ title: '完成成功', icon: 'success' });
        this.loadOrders();
      } else {
        wx.showToast({ title: res.message || '完成失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '完成失败', icon: 'none' });
    }
  },

  // 评价住户
  goToEvaluate(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '评价住户',
      content: '请对该订单的住户进行评价（1-5分）',
      editable: true,
      placeholderText: '输入评价内容（可选）',
      success: async (res) => {
        if (res.confirm) {
          const rating = 5; // 默认5分，实际应使用评分组件
          const comment = res.content || '';
          try {
            const result = await post(`/orders/${id}/repairman-evaluate`, {
              rating,
              comment
            });
            if (result.code === 200) {
              wx.showToast({ title: '评价成功', icon: 'success' });
              this.loadOrders();
            } else {
              wx.showToast({ title: result.message || '评价失败', icon: 'none' });
            }
          } catch (err) {
            wx.showToast({ title: '评价失败', icon: 'none' });
          }
        }
      }
    });
  },

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
});
