const { get, put, post } = require('../../utils/request.js');

const BASE_URL = 'http://localhost:3000/api';

Page({
  data: {
    processingOrders: [],
    completedOrders: [],
    isLoading: false,
    showEvalModal: false,
    evalOrderId: null,
    evalRating: 5,
    evalComment: ''
  },

  onLoad() { this.loadOrders(); },
  onShow() { this.loadOrders(); },

  async loadOrders() {
    this.setData({ isLoading: true });
    try {
      const res = await get('/repairman/orders/mine');
      if (res.code === 200) {
        const processingOrders = res.data.filter(o => o.status === 'processing');
        const completedOrders = res.data.filter(o => o.status === 'completed');
        // Fetch eval status for completed orders
        for (const order of completedOrders) {
          try {
            const evalRes = await get(`/evaluations/order/${order.orderId}`);
            if (evalRes.code === 200 && evalRes.data) {
              order.hasUserEval = !!evalRes.data.rating;
              order.hasRepairmanEval = !!evalRes.data.repairmanRating;
            } else {
              order.hasUserEval = false;
              order.hasRepairmanEval = false;
            }
          } catch {
            order.hasUserEval = false;
            order.hasRepairmanEval = false;
          }
        }
        this.setData({ processingOrders, completedOrders });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async handleComplete(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.chooseImage({
      count: 5,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (imgRes) => {
        wx.showLoading({ title: '上传中...' });
        try {
          const token = wx.getStorageSync('token');
          const uploadPromises = imgRes.tempFilePaths.map(path => new Promise((resolve, reject) => {
            wx.uploadFile({
              url: `${BASE_URL}/upload/completion`,
              filePath: path,
              name: 'image',
              header: { Authorization: `Bearer ${token}` },
              success: (r) => {
                const data = JSON.parse(r.data);
                resolve(data.data.urls[0]);
              },
              fail: reject
            });
          }));
          const urls = await Promise.all(uploadPromises);
          wx.hideLoading();
          const res = await put(`/repairman/orders/${orderId}/complete`, { completionImageUrls: urls });
          if (res.code === 200) {
            wx.showToast({ title: '完成报修', icon: 'success' });
            this.loadOrders();
          } else {
            wx.showToast({ title: res.message || '操作失败', icon: 'none' });
          }
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
      }
    });
  },

  openEvalModal(e) {
    const orderId = e.currentTarget.dataset.id;
    this.setData({ showEvalModal: true, evalOrderId: orderId, evalRating: 5, evalComment: '' });
  },

  closeEvalModal() { this.setData({ showEvalModal: false }); },

  onRatingChange(e) { this.setData({ evalRating: parseInt(e.detail.value) }); },
  onCommentInput(e) { this.setData({ evalComment: e.detail.value }); },

  async submitEval() {
    const { evalOrderId, evalRating, evalComment } = this.data;
    try {
      const res = await post(`/repairman/evaluations/${evalOrderId}`, { rating: evalRating, comment: evalComment });
      if (res.code === 200) {
        wx.showToast({ title: '评价成功', icon: 'success' });
        this.setData({ showEvalModal: false });
        this.loadOrders();
      } else {
        wx.showToast({ title: res.message || '评价失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  }
});
